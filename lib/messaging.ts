import { isRole, type Role } from './access.ts';

export type ChatPerson={id:string;name:string;role:Role;active:number;avatarUrl?:string};
export type ChatMessage={id:number;conversationId:string;senderId:string;senderName:string;senderRole:Role;body:string;createdAt:string};
export type ChatConversation={id:string;peer:ChatPerson;lastMessage:ChatMessage;unread:number};
export type ChatInbox={contacts:ChatPerson[];conversations:ChatConversation[];unreadTotal:number};
export type ChatThread={peer:ChatPerson;conversationId:string|null;messages:ChatMessage[];hasOlder:boolean;hasMore:boolean;peerReadId:number};

export class MessageError extends Error {
  status:number;
  constructor(message:string,status=400){super(message);this.status=status}
}
export const messageLimit=4000;
export function messageText(value:unknown) {
  if(typeof value!=='string'||value.length>messageLimit||!value.trim())throw new MessageError('Tin nhắn cần có nội dung và không quá 4.000 ký tự.');
  return value.trim();
}
export function personId(value:unknown) {
  if(typeof value!=='string'||!value.trim()||value.length>100)throw new MessageError('Người nhận chưa hợp lệ.');
  return value.trim();
}
export function conversationPair(senderId:string,peerId:string) {
  if(senderId===peerId)throw new MessageError('Chọn người khác để bắt đầu trò chuyện.');
  return senderId<peerId?[senderId,peerId]:[peerId,senderId];
}
export function messageCursor(value:unknown) {
  if(typeof value==='string'&&/^\d+$/.test(value))value=Number(value);
  if(!Number.isSafeInteger(value)||Number(value)<0)throw new MessageError('Mốc tin nhắn chưa hợp lệ.');
  return Number(value);
}
export function sendId(value:unknown) {
  if(typeof value!=='string'||!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value))throw new MessageError('Mã gửi tin nhắn chưa hợp lệ.');
  return value.toLowerCase();
}
export function chatPerson(row:{id:unknown;name:unknown;role:unknown;active:unknown}):ChatPerson {
  if(!isRole(row.role))throw new MessageError('Vai trò tài khoản chưa hợp lệ.',403);
  return {id:String(row.id),name:String(row.name),role:row.role,active:Number(row.active)};
}
export function messagesHref(role:Role,peer?:string) {
  return `/${role}/messages`+(peer?`?peer=${encodeURIComponent(peer)}`:'');
}
export function mergeMessages(existing:ChatMessage[],incoming:ChatMessage[]) {
  return [...new Map([...existing,...incoming].map(message=>[message.id,message])).values()].sort((a,b)=>a.id-b.id);
}
