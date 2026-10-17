'use client';
import { useCallback,useEffect,useRef,useState,type FormEvent } from 'react';
import { studentPages,viewPath,type Role } from '../lib/access';
import { lecturerHref,lecturerPages } from '../lib/lecturer-pages';
import { MessageError,messagesHref,mergeMessages,messageLimit,type ChatInbox,type ChatMessage,type ChatPerson,type ChatThread } from '../lib/messaging';
import { languageCookie,translate,type Language } from '../lib/i18n';
import { formatMessageTimestamp } from '../lib/message-date';
import { demoText } from '../lib/demo-i18n';
import { roles,type User } from '../lib/domain';
import AdminNavigation from './AdminNavigation';
import MessageUnreadBadge from './MessageUnreadBadge';
import LanguageToggle from './LanguageToggle';
import UiIcon from './UiIcon';
import WorkspaceProfile from './WorkspaceProfile';
import WorkspaceHeader from './WorkspaceHeader';
import UserAvatar from './UserAvatar';
import SiteFooter from './SiteFooter';
import { useUnsavedChanges } from './useUnsavedChanges';

export default function MessagesWorkspace({user,language:initialLanguage,initialInbox,initialThread}:{user:User;language:Language;initialInbox:ChatInbox;initialThread:ChatThread|null}) {
  const role=user.role as Role;
  const [language,setLanguage]=useState(initialLanguage),[inbox,setInbox]=useState(initialInbox),[thread,setThread]=useState(initialThread);
  const [peerId,setPeerId]=useState(initialThread?.peer.id||'');
  const [tab,setTab]=useState<'conversations'|'contacts'>(initialInbox.conversations.length?'conversations':'contacts');
  const [search,setSearch]=useState(''),[roleFilter,setRoleFilter]=useState('all'),[text,setText]=useState('');
  const [loading,setLoading]=useState(false),[sending,setSending]=useState(false),[olderLoading,setOlderLoading]=useState(false);
  const [notice,setNotice]=useState(''),[newBelow,setNewBelow]=useState(false),[help,setHelp]=useState(false);
  const scroll=useRef<HTMLDivElement>(null),composer=useRef<HTMLTextAreaElement>(null);
  const activePeer=useRef(peerId),threadRef=useRef(thread),nearBottom=useRef(true),readCursor=useRef(0),readBusy=useRef(false);
  const pendingSend=useRef<{peerId:string;body:string;id:string}|null>(null);
  const mounted=useRef(true),pollBusy=useRef(false);
  const {markChanged,markSaved}=useUnsavedChanges();
  const tr=(value:string,args:readonly unknown[]=[])=>translate(value,language,args);
  const name=(person:{name:string;id:string})=>demoText(person.name,person.id,language);
  const current=thread?.peer.id===peerId?thread:null;
  const peer=current?.peer||inbox.contacts.find(p=>p.id===peerId)||inbox.conversations.find(c=>c.peer.id===peerId)?.peer;
  const newest=current?.messages.at(-1)?.id||0;
  const messageTime=(value:string)=>formatMessageTimestamp(value,language).time;

  useEffect(()=>{threadRef.current=thread},[thread]);
  useEffect(()=>{if(text.trim())markChanged();else markSaved()},[text,markChanged,markSaved]);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
  useEffect(()=>{
    document.documentElement.lang=language;document.title=translate('Tin nhắn',language)+' · THINK UP';
    document.cookie=languageCookie+'='+language+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');
  },[language]);

  const request=useCallback(async(path:string,body?:Record<string,unknown>)=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetch(path,{cache:'no-store',signal:controller.signal,...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
      const result=await response.json() as {error?:string};
      if(!response.ok){if(response.status===401)location.assign('/login');throw new MessageError(result.error||'Chưa thể cập nhật tin nhắn.',response.status)}
      return result;
    }catch(error){
      if(error instanceof TypeError||(error instanceof DOMException&&error.name==='AbortError'))throw new Error('Mất kết nối. Nội dung đang soạn được giữ lại; bạn có thể thử gửi lại.');
      throw error;
    }finally{clearTimeout(timer)}
  },[]);

  const acknowledge=useCallback(async()=>{
    const row=threadRef.current,last=row?.messages.at(-1)?.id||0;
    if(!row?.conversationId||row.peer.id!==activePeer.current||!nearBottom.current||document.visibilityState==='hidden'||!document.hasFocus()||last<=readCursor.current||readBusy.current)return;
    readBusy.current=true;
    const target=row.peer.id;
    try{
      await request('/api/messages',{action:'read',conversationId:row.conversationId,through:last});
      if(activePeer.current===target){readCursor.current=Math.max(readCursor.current,last);if(mounted.current)setInbox(await request('/api/messages') as ChatInbox)}
    }catch{/* The read marker is retried while this conversation stays visible. */}
    finally{readBusy.current=false}
  },[request]);

  const refresh=useCallback(async()=>{
    if(document.visibilityState==='hidden'||pollBusy.current)return;
    pollBusy.current=true;const selected=activePeer.current;
    try{
      const fresh=await request('/api/messages') as ChatInbox;if(mounted.current)setInbox(fresh);
      if(selected&&threadRef.current?.peer.id===selected){
        let after=threadRef.current.messages.at(-1)?.id||0;
        for(let page=0;page<10;page++){
          const updated=await request(`/api/messages?peer=${encodeURIComponent(selected)}&after=${after}`) as ChatThread;
          if(!mounted.current||activePeer.current!==selected)break;
          setThread(previous=>previous?.peer.id===selected?{...previous,peer:updated.peer,conversationId:updated.conversationId,peerReadId:updated.peerReadId,messages:mergeMessages(previous.messages,updated.messages)}:previous);
          if(!updated.hasMore||!updated.messages.length)break;
          after=updated.messages.at(-1)!.id;
        }
      }
      void acknowledge();
      if(mounted.current)setNotice(previous=>previous==='Mất kết nối. Nội dung đang soạn được giữ lại; bạn có thể thử gửi lại.'?'':previous);
    }catch(error){if(mounted.current){setNotice(error instanceof Error?error.message:'Chưa thể cập nhật tin nhắn.');if(error instanceof MessageError&&error.status===404&&activePeer.current===selected)setThread(previous=>previous?.peer.id===selected?{...previous,peer:{...previous.peer,active:0}}:previous)}}
    finally{pollBusy.current=false}
  },[request,acknowledge]);

  useEffect(()=>{
    const timer=setInterval(refresh,4000);
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh)};
  },[refresh]);
  useEffect(()=>{
    if(!newest||!scroll.current)return;
    if(nearBottom.current){scroll.current.scrollTop=scroll.current.scrollHeight;void acknowledge()}
  },[newest,peerId,acknowledge]);
  useEffect(()=>{if(peerId&&!loading&&!sending)composer.current?.focus()},[peerId,loading,sending]);
  useEffect(()=>{
    const onPop=()=>{const target=new URLSearchParams(location.search).get('peer')||'';if(target!==activePeer.current)void selectPeer(target,false)};
    window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop);
  });

  async function selectPeer(id:string,push=true) {
    if(sending){if(!push)history.replaceState({},'',messagesHref(role,activePeer.current));return}
    if(id===activePeer.current&&(!id||loading||threadRef.current?.peer.id===id))return;
    if(text.trim()&&!window.confirm(tr('Bạn đang soạn tin nhắn. Bỏ bản đang soạn để chuyển hội thoại?'))){history.replaceState({},'',messagesHref(role,activePeer.current));return}
    activePeer.current=id;setPeerId(id);setThread(null);threadRef.current=null;readCursor.current=0;nearBottom.current=true;setNewBelow(false);setText('');pendingSend.current=null;markSaved();setNotice('');
    if(push)history.pushState({},'',messagesHref(role,id));
    if(!id){setLoading(false);return}
    setLoading(true);
    try{const row=await request(`/api/messages?peer=${encodeURIComponent(id)}`) as ChatThread;if(activePeer.current===id&&mounted.current){threadRef.current=row;setThread(row);composer.current?.focus()}}
    catch(error){if(activePeer.current===id&&mounted.current)setNotice(error instanceof Error?error.message:tr('Chưa thể mở hội thoại.'))}
    finally{if(activePeer.current===id&&mounted.current)setLoading(false)}
  }
  async function send(event?:FormEvent) {
    event?.preventDefault();const selected=activePeer.current,body=text.trim();
    if(!body||!selected||sending||!current||!current.peer.active)return;
    if(!pendingSend.current||pendingSend.current.peerId!==selected||pendingSend.current.body!==body)pendingSend.current={peerId:selected,body,id:crypto.randomUUID()};
    setSending(true);setNotice('');
    try{
      const result=await request('/api/messages',{action:'send',peerId:selected,text:body,clientId:pendingSend.current.id}) as {message:ChatMessage};
      if(!mounted.current)return;
      nearBottom.current=true;setNewBelow(false);
      setThread(previous=>previous?.peer.id===selected?{...previous,conversationId:result.message.conversationId,messages:mergeMessages(previous.messages,[result.message])}:previous);
      setText('');markSaved();pendingSend.current=null;void refresh();
    }catch(error){if(mounted.current)setNotice(error instanceof Error?error.message:tr('Tin chưa gửi được. Nội dung vẫn được giữ để thử lại.'))}
    finally{if(mounted.current){setSending(false);composer.current?.focus()}}
  }
  async function loadOlder() {
    if(!current?.messages.length||olderLoading)return;
    const selected=current.peer.id,before=current.messages[0].id,height=scroll.current?.scrollHeight||0,top=scroll.current?.scrollTop||0;
    setOlderLoading(true);
    try{
      const older=await request(`/api/messages?peer=${encodeURIComponent(selected)}&before=${before}`) as ChatThread;
      if(activePeer.current!==selected||!mounted.current)return;
      setThread(previous=>previous?.peer.id===selected?{...previous,hasOlder:older.hasOlder,messages:mergeMessages(older.messages,previous.messages)}:previous);
      requestAnimationFrame(()=>{if(scroll.current&&activePeer.current===selected)scroll.current.scrollTop=top+scroll.current.scrollHeight-height});
    }catch(error){if(mounted.current)setNotice(error instanceof Error?error.message:tr('Chưa thể tải lịch sử tin nhắn.'))}
    finally{if(mounted.current)setOlderLoading(false)}
  }
  async function logout() {
    if(sending||text.trim()){setNotice(tr('Gửi hoặc xóa bản đang soạn trước khi đăng xuất.'));return}
    try{const response=await fetch('/api/auth/logout',{method:'POST'});if(!response.ok)throw new Error();location.assign('/')}
    catch{setNotice(tr('Chưa thể đăng xuất. Vui lòng thử lại.'))}
  }
  const matches=(person:ChatPerson)=>(roleFilter==='all'||person.role===roleFilter)&&`${name(person)} ${tr(roles[person.role])}`.toLowerCase().includes(search.trim().toLowerCase());

  return <div className="app-shell messaging-workspace">
    <WorkspaceHeader language={language} controls={<LanguageToggle language={language} onChange={setLanguage}/>} profile={<WorkspaceProfile user={user} language={language} busy={sending} onLogout={()=>void logout()}/>}>
{role==='admin'?<AdminNavigation section="messages" query={{}} language={language} unread={inbox.unreadTotal} busy={sending}/>:<nav aria-label={tr('Điều hướng chính')}>{role==='lecturer'?lecturerPages.map(page=><a key={page.key} href={lecturerHref(page.key)} className={page.key==='messages'?'active':''} aria-current={page.key==='messages'?'page':undefined}><UiIcon name={page.icon}/><span>{tr(page.label)}</span>{page.key==='messages'&&<MessageUnreadBadge language={language} count={inbox.unreadTotal}/>}</a>):studentPages.map(page=><a key={page.key} href={viewPath(role,page.key)} className={page.key==='messages'?'active':''} aria-current={page.key==='messages'?'page':undefined}><UiIcon name={page.key}/><span>{tr(page.label)}</span>{page.key==='messages'&&<MessageUnreadBadge language={language} count={inbox.unreadTotal}/>}</a>)}</nav>}
</WorkspaceHeader>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb">{tr(role==='admin'?'Không gian quản trị':role==='lecturer'?'Không gian giảng dạy':'Không gian học tập')}<span className="crumb">/ {tr('Tin nhắn')}</span></div><div className="top-controls"><button className="help-button" aria-label={tr('Hướng dẫn sử dụng')} onClick={()=>setHelp(!help)}><UiIcon name="help"/></button></div></header>
      <main id="workspace-main" tabIndex={-1}><div className="page-heading"><div><h1>{tr('Tin nhắn')}</h1><p>{tr('Trao đổi trực tiếp với sinh viên, giảng viên và quản trị viên.')}</p></div><button className="button primary" disabled={sending} onClick={()=>{void selectPeer('');setTab('contacts');setSearch('');setRoleFilter('all')}}><UiIcon name="add" size={16}/>{tr('Tin nhắn mới')}</button></div>
        {help&&<div className="notice chat-help"><b>{tr('Trò chuyện riêng 1–1')}</b><p>{tr('Chọn một tài khoản trong Mọi người để bắt đầu. Chỉ hai người trong hội thoại xem được lịch sử, kể cả khi có vai trò admin. Tên và vai trò tại thời điểm gửi được lưu cùng tin nhắn.')}</p><button className="text-button" onClick={()=>setHelp(false)}>{tr('Đóng')}</button></div>}
        {notice&&<div className="notice warning chat-notice" role="alert"><span>{tr(notice)}</span><button className="icon-button" aria-label={tr('Đóng thông báo')} onClick={()=>setNotice('')}><UiIcon name="close" size={16}/></button></div>}
        <div className={`chat-layout ${peerId?'has-chat':''}`}>
          <section className="chat-directory panel" aria-label={tr('Danh sách trò chuyện')}>
            <div className="chat-directory-tabs">{(['conversations','contacts'] as const).map(value=><button type="button" key={value} aria-pressed={tab===value} className={tab===value?'selected':''} onClick={()=>setTab(value)}>{tr(value==='conversations'?'Hội thoại':'Mọi người')}{value==='conversations'&&inbox.unreadTotal>0&&<small>{inbox.unreadTotal}</small>}</button>)}</div>
            <div className="chat-search"><input aria-label={tr('Tìm người trò chuyện')} placeholder={tr('Tìm theo tên…')} value={search} maxLength={120} onChange={e=>setSearch(e.target.value)}/><select aria-label={tr('Lọc theo vai trò')} value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}><option value="all">{tr('Tất cả vai trò')}</option>{Object.entries(roles).map(([key,label])=><option key={key} value={key}>{tr(label)}</option>)}</select></div>
            <div className="chat-people">{tab==='conversations'?inbox.conversations.filter(c=>matches(c.peer)).map(c=><button className={`chat-person ${peerId===c.peer.id?'selected':''}`} key={c.id} disabled={sending} onClick={()=>void selectPeer(c.peer.id)}><UserAvatar person={c.peer}/><span className="chat-person-info"><b>{name(c.peer)}</b><span className={`chat-role ${c.peer.role}`}>{tr(roles[c.peer.role])}</span><small className="chat-preview">{c.lastMessage.senderId===user.id?tr('Bạn:')+' ':''}{c.lastMessage.body}</small></span><span className="chat-person-tail"><small>{messageTime(c.lastMessage.createdAt)}</small>{c.unread>0&&<b className="chat-unread" aria-label={tr('{0} tin chưa đọc',[c.unread])}>{c.unread}</b>}</span></button>):inbox.contacts.filter(matches).map(person=><button className={`chat-person ${peerId===person.id?'selected':''}`} key={person.id} disabled={sending} onClick={()=>void selectPeer(person.id)}><UserAvatar person={person}/><span className="chat-person-info"><b>{name(person)}</b><span className={`chat-role ${person.role}`}>{tr(roles[person.role])}</span></span><UiIcon name="next" size={16}/></button>)}
              {(tab==='conversations'?inbox.conversations.filter(c=>matches(c.peer)):inbox.contacts.filter(matches)).length===0&&<div className="empty"><UiIcon name="messages" size={25}/><h4>{tr(tab==='conversations'?'Chưa có hội thoại phù hợp':'Chưa tìm thấy người phù hợp')}</h4><p>{tr('Mở Mọi người hoặc đổi từ khóa, vai trò để bắt đầu trò chuyện.')}</p></div>}
            </div>
          </section>
          <section className="chat-conversation panel" aria-label={tr('Hội thoại riêng')}>
            {peerId?<>
              <header className="chat-header"><button className="icon-button chat-back" aria-label={tr('Quay lại danh sách trò chuyện')} onClick={()=>void selectPeer('')}><UiIcon name="next"/></button><UserAvatar person={peer||{name:'…'}}/><div><h2>{peer?name(peer):tr('Đang mở hội thoại…')}</h2>{peer&&<span className={`chat-role ${peer.role}`}>{tr(roles[peer.role])}</span>}</div><span className="chat-private">{tr('Hội thoại riêng')}</span></header>
              <div className="chat-history" ref={scroll} role="log" aria-label={tr('Lịch sử tin nhắn')} aria-live="polite" aria-relevant="additions" onScroll={()=>{
                const node=scroll.current;if(!node)return;nearBottom.current=node.scrollHeight-node.scrollTop-node.clientHeight<80;if(nearBottom.current){setNewBelow(false);void acknowledge()}else setNewBelow(true);
              }}>
                {loading?<div className="empty" role="status">{tr('Đang tải tin nhắn…')}</div>:<>
                  {current?.hasOlder&&<button className="text-button chat-older" disabled={olderLoading} onClick={()=>void loadOlder()}>{tr(olderLoading?'Đang tải…':'Xem tin nhắn trước')}</button>}
                  {!current?.messages.length&&<div className="empty"><UiIcon name="messages" size={30}/><h4>{tr('Bắt đầu cuộc trò chuyện')}</h4><p>{tr('Gửi lời chào hoặc trao đổi về bài reflection, học phần và những điều bạn cần hỗ trợ.')}</p></div>}
                  {current?.messages.map((message,i)=>{
                    const own=message.senderId===user.id,previous=current.messages[i-1],timestamp=formatMessageTimestamp(message.createdAt,language);
                    return <div key={message.id}>{(!previous||formatMessageTimestamp(previous.createdAt,language).dayKey!==timestamp.dayKey)&&<div className="chat-day">{timestamp.date}</div>}<article className={`chat-message ${own?'own':''}`}><div className="chat-message-identity"><b>{demoText(message.senderName,message.senderId,language)}</b><span className={`chat-role ${message.senderRole}`}>{tr(roles[message.senderRole])}</span></div><p>{message.body}</p><footer><time dateTime={message.createdAt}>{timestamp.time}</time>{own&&<span><UiIcon name="check" size={12}/>{tr(message.id<=current.peerReadId?'Đã đọc':'Đã gửi')}</span>}</footer></article></div>;
                  })}
                </>}
              </div>
              {newBelow&&<button className="chat-to-bottom text-button" onClick={()=>{nearBottom.current=true;setNewBelow(false);if(scroll.current)scroll.current.scrollTop=scroll.current.scrollHeight;void acknowledge()}}><UiIcon name="down" size={14}/>{tr('Xuống tin nhắn mới nhất')}</button>}
              {peer&&!peer.active&&<div className="notice chat-inactive">{tr('Tài khoản này đã tạm ngừng. Bạn vẫn có thể đọc lịch sử, nhưng chưa thể gửi thêm tin.')}</div>}
              <form className="chat-composer" onSubmit={send}><label className="sr-only" htmlFor="chat-message-input">{tr('Soạn tin nhắn')}</label><textarea id="chat-message-input" ref={composer} rows={3} maxLength={messageLimit} value={text} disabled={sending||loading||!current||!peer?.active} placeholder={tr('Viết tin nhắn…')} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send()}}}/><div><small>{tr('Enter để gửi · Shift + Enter để xuống dòng')}<span>{text.length}/{messageLimit}</span></small><button className="button primary" disabled={sending||loading||!current||!peer?.active||!text.trim()}>{sending?tr('Đang gửi…'):tr('Gửi tin nhắn')}<UiIcon name="next" size={16}/></button></div></form>
            </>:<div className="chat-welcome empty"><div className="chat-welcome-icon"><UiIcon name="messages" size={30}/></div><span className="eyebrow">{tr('Kết nối trong THINK UP')}</span><h2>{tr('Một cuộc trò chuyện giúp mọi việc rõ hơn.')}</h2><p>{tr('Chọn người bên trái để trao đổi. Bạn có thể nhắn cho sinh viên, giảng viên và admin; tên và vai trò luôn được hiển thị rõ.')}</p><button className="button" onClick={()=>setTab('contacts')}>{tr('Chọn người để nhắn')}</button></div>}
          </section>
        </div>
        <SiteFooter language={language} compact onHelp={()=>setHelp(!help)}/>
      </main>
    </div>
  </div>;
}
