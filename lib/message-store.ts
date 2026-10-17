import { chatPerson,conversationPair,messageCursor,messageText,personId,sendId,MessageError,type ChatInbox,type ChatMessage,type ChatPerson,type ChatThread } from './messaging.ts';

import {attachAvatars} from './profile-store.ts';

type Row=Record<string,unknown>;
const parseMessage=(row:Row):ChatMessage=>({id:Number(row.id),conversationId:String(row.conversation_id),senderId:String(row.sender_id),senderName:String(row.sender_name),senderRole:chatPerson({id:row.sender_id,name:row.sender_name,role:row.sender_role,active:1}).role,body:String(row.body),createdAt:String(row.created_at)});
const parsePeer=(row:Row):ChatPerson=>chatPerson({id:row.peer_id,name:row.peer_name,role:row.peer_role,active:row.peer_active});

export function messageStore(db:D1Database) {
  const prepare=(sql:string,...args:unknown[])=>db.prepare(sql).bind(...args);
  const all=async(sql:string,...args:unknown[])=>(await prepare(sql,...args).all<Row>()).results;
  const one=(sql:string,...args:unknown[])=>prepare(sql,...args).first<Row>();

  async function unread(userId:string) {
    const row=await one(`SELECT COUNT(*) AS n FROM chat_messages m JOIN chat_conversations c ON c.id=m.conversation_id
      WHERE (c.low_user_id=? OR c.high_user_id=?) AND m.sender_id!=?
      AND m.id>CASE WHEN c.low_user_id=? THEN c.low_read_id ELSE c.high_read_id END`,userId,userId,userId,userId);
    return Number(row?.n||0);
  }
  async function inbox(userId:string):Promise<ChatInbox> {
    const [contacts,rows,unreadTotal]=await Promise.all([
      all('SELECT id,name,role,active FROM users WHERE active=1 AND id!=? ORDER BY name,id',userId),
      all(`SELECT c.id AS room_id,p.id AS peer_id,p.name AS peer_name,p.role AS peer_role,p.active AS peer_active,m.*,
        (SELECT COUNT(*) FROM chat_messages incoming WHERE incoming.conversation_id=c.id AND incoming.sender_id!=?
        AND incoming.id>CASE WHEN c.low_user_id=? THEN c.low_read_id ELSE c.high_read_id END) AS unread
        FROM chat_conversations c JOIN users p ON p.id=CASE WHEN c.low_user_id=? THEN c.high_user_id ELSE c.low_user_id END
        JOIN chat_messages m ON m.id=c.last_message_id
        WHERE c.low_user_id=? OR c.high_user_id=? ORDER BY c.last_message_id DESC`,userId,userId,userId,userId,userId),
      unread(userId),
    ]);
    const people=contacts.map(row=>chatPerson(row as {id:unknown;name:unknown;role:unknown;active:unknown}));
    const conversations=rows.map(row=>({id:String(row.room_id),peer:parsePeer(row),lastMessage:parseMessage(row),unread:Number(row.unread)}));
    const avatars=new Map((await attachAvatars(db,[...people,...conversations.map(c=>c.peer)])).map(p=>[p.id,p]));
    return {contacts:people.map(p=>avatars.get(p.id)!),conversations:conversations.map(c=>({...c,peer:avatars.get(c.peer.id)!})),unreadTotal};
  }
  async function thread(userId:string,recipient:unknown,{before,after}:{before?:unknown;after?:unknown}={}):Promise<ChatThread> {
    const peerId=personId(recipient),[low,high]=conversationPair(userId,peerId);
    if(before!==undefined&&after!==undefined)throw new MessageError('Chỉ chọn một mốc lịch sử tin nhắn.');
    const [person,room]=await Promise.all([one('SELECT id,name,role,active FROM users WHERE id=?',peerId),one('SELECT * FROM chat_conversations WHERE low_user_id=? AND high_user_id=?',low,high)]);
    if(!person||(!person.active&&!room))throw new MessageError('Không tìm thấy người nhận.',404);
    const peer=(await attachAvatars(db,[chatPerson(person as {id:unknown;name:unknown;role:unknown;active:unknown})]))[0];
    const cursor=before!==undefined?messageCursor(before):after!==undefined?messageCursor(after):undefined;
    if(!room)return {peer,conversationId:null,messages:[],hasOlder:false,hasMore:false,peerReadId:0};
    const incremental=after!==undefined,limit=incremental?100:50;
    const rows=await all(`SELECT * FROM chat_messages WHERE conversation_id=?${cursor!==undefined?` AND id${incremental?'>':'<'}?`:''} ORDER BY id ${incremental?'ASC':'DESC'} LIMIT ?`,room.id,...(cursor!==undefined?[cursor]:[]),limit+1);
    const more=rows.length>limit;
    const messages=rows.slice(0,limit).map(parseMessage);if(!incremental)messages.reverse();
    return {peer,conversationId:String(room.id),messages,hasOlder:!incremental&&more,hasMore:incremental&&more,peerReadId:Number(room.low_user_id===peerId?room.low_read_id:room.high_read_id)};
  }
  async function send(userId:string,recipient:unknown,text:unknown,requestId:unknown):Promise<ChatMessage> {
    const peerId=personId(recipient),body=messageText(text),clientId=sendId(requestId),[low,high]=conversationPair(userId,peerId);
    const existing=await one(`SELECT m.*,c.low_user_id,c.high_user_id FROM chat_messages m JOIN chat_conversations c ON c.id=m.conversation_id WHERE m.sender_id=? AND m.client_id=?`,userId,clientId);
    if(existing){if(existing.body!==body||existing.low_user_id!==low||existing.high_user_id!==high)throw new MessageError('Mã gửi đã được dùng cho tin nhắn khác.',409);return parseMessage(existing)}
    const peer=await one('SELECT id FROM users WHERE id=? AND active=1',peerId);
    if(!peer)throw new MessageError('Người nhận không còn hoạt động. Chưa thể gửi tin nhắn.',403);
    const minute=Math.floor(Date.now()/60000)*60000;
    const rate=await one(`INSERT INTO auth_limits (key,window_start,attempts) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET
      attempts=CASE WHEN window_start=excluded.window_start THEN attempts+1 ELSE 1 END,window_start=excluded.window_start RETURNING attempts`,`chat:${userId}`,minute);
    if(Number(rate?.attempts)>60)throw new MessageError('Bạn gửi tin quá nhanh. Vui lòng chờ một phút.',429);
    const timestamp=new Date().toISOString();
    await db.batch([
      prepare(`INSERT INTO chat_conversations (id,low_user_id,high_user_id,created_at,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(low_user_id,high_user_id) DO NOTHING`,crypto.randomUUID(),low,high,timestamp,timestamp),
      prepare(`INSERT INTO chat_messages (conversation_id,sender_id,sender_name,sender_role,client_id,body,created_at)
        SELECT c.id,s.id,s.name,s.role,?,?,? FROM chat_conversations c JOIN users s ON s.id=? JOIN users r ON r.id=?
        WHERE c.low_user_id=? AND c.high_user_id=? AND s.active=1 AND r.active=1
        ON CONFLICT(sender_id,client_id) DO NOTHING`,clientId,body,timestamp,userId,peerId,low,high),
      prepare(`UPDATE chat_conversations SET last_message_id=COALESCE((SELECT MAX(id) FROM chat_messages WHERE conversation_id=chat_conversations.id),0),
        updated_at=COALESCE((SELECT created_at FROM chat_messages WHERE conversation_id=chat_conversations.id ORDER BY id DESC LIMIT 1),updated_at)
        WHERE low_user_id=? AND high_user_id=?`,low,high),
    ]);
    const row=await one(`SELECT m.*,c.low_user_id,c.high_user_id FROM chat_messages m JOIN chat_conversations c ON c.id=m.conversation_id WHERE m.sender_id=? AND m.client_id=?`,userId,clientId);
    if(!row)throw new MessageError('Tài khoản không còn hoạt động. Tin nhắn chưa được gửi.',403);
    if(row.body!==body||row.low_user_id!==low||row.high_user_id!==high)throw new MessageError('Mã gửi đã được dùng cho tin nhắn khác.',409);
    return parseMessage(row);
  }
  async function markRead(userId:string,conversationId:unknown,through:unknown) {
    const roomId=personId(conversationId),cursor=messageCursor(through);
    const result=await prepare(`UPDATE chat_conversations SET
      low_read_id=CASE WHEN low_user_id=? THEN MAX(low_read_id,MIN(last_message_id,?)) ELSE low_read_id END,
      high_read_id=CASE WHEN high_user_id=? THEN MAX(high_read_id,MIN(last_message_id,?)) ELSE high_read_id END
      WHERE id=? AND (low_user_id=? OR high_user_id=?)`,userId,cursor,userId,cursor,roomId,userId,userId).run();
    if(!result.meta.changes)throw new MessageError('Không tìm thấy hội thoại của bạn.',404);
    return {ok:true};
  }
  return {inbox,thread,send,markRead,unread};
}
