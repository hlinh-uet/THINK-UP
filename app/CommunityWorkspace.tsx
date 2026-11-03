'use client';
import { useCallback,useEffect,useRef,useState,type ChangeEvent,type FormEvent } from 'react';
import { studentPages,viewPath,type Role } from '../lib/access';
import { lecturerHref } from '../lib/lecturer-pages';
import { adminHref } from '../lib/admin-pages';
import { commentLimit,communityHref,imageLimit,imageTypes,postLimit,reactionKinds,type CommunityComment,type CommunityFeed,type CommunityPost,type CommunitySort,type ReactionKind } from '../lib/community';
import { languageCookie,translate,type Language } from '../lib/i18n';
import { formatMessageTimestamp } from '../lib/message-date';
import { demoText } from '../lib/demo-i18n';
import { roles,type User } from '../lib/domain';
import AdminNavigation from './AdminNavigation';
import LecturerNavigation from './LecturerNavigation';
import MessageUnreadBadge from './MessageUnreadBadge';
import LanguageToggle from './LanguageToggle';
import UiIcon from './UiIcon';
import UserAvatar from './UserAvatar';
import WorkspaceHeader from './WorkspaceHeader';
import WorkspaceProfile from './WorkspaceProfile';
import SiteFooter from './SiteFooter';
import { useUnsavedChanges } from './useUnsavedChanges';

const reactionFace:Record<ReactionKind,string>={like:'👍',love:'❤️',haha:'😆'};
const reactionLabel:Record<ReactionKind,string>={like:'Thích',love:'Yêu thích',haha:'Haha'};
type ApiResult={post?:CommunityPost;posts?:CommunityPost[];removed?:string;error?:string};
type Draft={id?:string;body:string;image:File|null;preview:string|null;removeImage:boolean};
const emptyDraft:Draft={body:'',image:null,preview:null,removeImage:false};

export default function CommunityWorkspace({user,language:initialLanguage,initialFeed,focusPost}:{user:User;language:Language;initialFeed:CommunityFeed;focusPost?:string}) {
  const role=user.role as Role;
  const [language,setLanguage]=useState(initialLanguage),[posts,setPosts]=useState(initialFeed.posts);
  const [sort,setSort]=useState<CommunitySort>('new'),[view,setView]=useState<'feed'|'mine'>('feed'),[mineFilter,setMineFilter]=useState<'all'|'image'|'closed'>('all');
  const [sortOpen,setSortOpen]=useState(false),[menu,setMenu]=useState(''),[picker,setPicker]=useState('');
  const [composer,setComposer]=useState<Draft>(emptyDraft),[editing,setEditing]=useState<Draft|null>(null),[removing,setRemoving]=useState<CommunityPost|null>(null);
  const [drafts,setDrafts]=useState<Record<string,string>>({}),[replyTo,setReplyTo]=useState<Record<string,{id:string;name:string}|undefined>>({});
  const [now,setNow]=useState(()=>Date.now());
  const [expanded,setExpanded]=useState<Record<string,boolean>>({}),[busy,setBusy]=useState(''),[notice,setNotice]=useState(''),[help,setHelp]=useState(false);
  const pickerTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),longPress=useRef(false),fileInput=useRef<HTMLInputElement>(null),editFile=useRef<HTMLInputElement>(null);
  const {markChanged,markSaved}=useUnsavedChanges();
  const tr=useCallback((value:string,args:readonly unknown[]=[])=>translate(value,language,args),[language]);
  const name=(person:{name:string;id:string})=>demoText(person.name,person.id,language);
  const me=name(user);

  useEffect(()=>{if(composer.body.trim()||composer.image)markChanged();else markSaved()},[composer,markChanged,markSaved]);
  useEffect(()=>{
    document.documentElement.lang=language;document.title=translate('Cộng đồng',language)+' · THINK UP';
    document.cookie=languageCookie+'='+language+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');
  },[language]);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer)},[]);
  useEffect(()=>{
    if(!editing&&!removing)return;
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setEditing(null);setRemoving(null)}};
    document.addEventListener('keydown',escape);document.querySelector<HTMLElement>('.cm-modal textarea,.cm-confirm .button')?.focus();
    return()=>document.removeEventListener('keydown',escape);
  },[editing?.id,removing]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{
    if(!focusPost)return;
    const target=document.getElementById(`post-${focusPost}`);
    if(target){target.scrollIntoView({block:'center'});target.classList.add('is-focused')}
  },[focusPost]);
  useEffect(()=>{
    if(!menu&&!sortOpen)return;
    const close=(event:MouseEvent)=>{if(!(event.target as Element).closest('.cm-menu,.cm-menu-toggle')){setMenu('');setSortOpen(false)}};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setMenu('');setSortOpen(false)}};
    document.addEventListener('click',close);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('click',close);document.removeEventListener('keydown',escape)};
  },[menu,sortOpen]);

  const request=useCallback(async(init:RequestInit,query='')=>{
    const response=await fetch('/api/community'+query,{...init,headers:{...(init.body instanceof FormData?{}:{'Content-Type':'application/json'}),...init.headers}});
    const body=await response.json().catch(()=>({})) as ApiResult;
    if(!response.ok)throw new Error(body.error||tr('Chưa thể kết nối. Vui lòng thử lại.'));
    return body;
  },[tr]);
  const load=useCallback(async(nextSort:CommunitySort,mine:boolean)=>{
    try{setBusy('load');const feed=await request({method:'GET'},`?sort=${nextSort}${mine?'&mine=1':''}`);setPosts(feed.posts||[])}
    catch(error){setNotice((error as Error).message)}finally{setBusy('')}
  },[request]);
  const replace=(post:CommunityPost)=>setPosts(list=>list.map(p=>p.id===post.id?post:p));
  async function act(key:string,body:Record<string,unknown>) {
    try{setBusy(key);const result=await request({method:'POST',body:JSON.stringify(body)});if(result.post)replace(result.post);return result}
    catch(error){setNotice((error as Error).message)}finally{setBusy('')}
  }

  function chooseImage(event:ChangeEvent<HTMLInputElement>,apply:(file:File,preview:string)=>void) {
    const file=event.target.files?.[0];event.target.value='';
    if(!file)return;
    if(!imageTypes.includes(file.type)){setNotice(tr('Chọn ảnh PNG, JPG hoặc WebP có nội dung đúng định dạng.'));return}
    if(file.size>imageLimit){setNotice(tr('Ảnh cần nhỏ hơn hoặc bằng 5 MB.'));return}
    apply(file,URL.createObjectURL(file));
  }
  async function savePost(draft:Draft,event?:FormEvent) {
    event?.preventDefault();
    if(!draft.body.trim()&&!draft.image&&(!draft.id||draft.removeImage||!posts.find(p=>p.id===draft.id)?.imageUrl))return;
    const form=new FormData();form.set('body',draft.body);
    if(draft.image)form.set('image',draft.image);
    if(draft.id){form.set('postId',draft.id);if(draft.removeImage)form.set('removeImage','1')}
    try{
      setBusy(draft.id?'edit':'post');
      const {post}=await request({method:'POST',body:form});if(!post)return;
      if(draft.id){replace(post);setEditing(null)}
      else{setPosts(list=>[post,...list]);setComposer(emptyDraft);if(view==='mine'||sort==='new')window.scrollTo({top:0,behavior:'smooth'})}
    }catch(error){setNotice((error as Error).message)}finally{setBusy('')}
  }
  async function confirmRemove() {
    if(!removing)return;
    const result=await act('remove',{action:'remove',postId:removing.id});
    if(result?.removed){setPosts(list=>list.filter(p=>p.id!==result.removed));setRemoving(null)}
  }
  async function sendComment(post:CommunityPost,event:FormEvent) {
    event.preventDefault();
    const text=(drafts[post.id]||'').trim();if(!text)return;
    const result=await act(`comment-${post.id}`,{action:'comment',postId:post.id,text,parentId:replyTo[post.id]?.id});
    if(result?.post){setDrafts(d=>({...d,[post.id]:''}));setReplyTo(r=>({...r,[post.id]:undefined}));setExpanded(e=>({...e,[post.id]:true}))}
  }
  function react(post:CommunityPost,kind:ReactionKind|null) {setPicker('');void act(`react-${post.id}`,{action:'react',postId:post.id,kind})}
  function openPicker(id:string){clearTimeout(pickerTimer.current);pickerTimer.current=setTimeout(()=>setPicker(id),350)}
  function closePicker(){clearTimeout(pickerTimer.current);pickerTimer.current=setTimeout(()=>setPicker(''),300)}
  async function copyLink(post:CommunityPost) {
    setMenu('');
    try{await navigator.clipboard.writeText(location.origin+communityHref(role,post.id));setNotice(tr('Đã sao chép liên kết bài viết.'))}
    catch{setNotice(tr('Chưa thể sao chép liên kết.'))}
  }
  function startEdit(post:CommunityPost){setMenu('');setEditing({id:post.id,body:post.body,image:null,preview:post.imageUrl,removeImage:false})}
  function openMine(){setView('mine');setSortOpen(false);setMineFilter('all');void load('new',true);window.scrollTo({top:0})}
  function openFeed(){setView('feed');void load(sort,false);window.scrollTo({top:0})}
  function changeSort(next:CommunitySort){setSortOpen(false);setSort(next);void load(next,false)}
  async function logout() {
    if(composer.body.trim()||composer.image){setNotice(tr('Đăng hoặc xóa bài đang soạn trước khi đăng xuất.'));return}
    try{const response=await fetch('/api/auth/logout',{method:'POST'});if(!response.ok)throw new Error();location.assign('/')}
    catch{setNotice(tr('Chưa thể đăng xuất. Vui lòng thử lại.'))}
  }

  const ago=(value:string)=>{
    const seconds=(now-new Date(value).getTime())/1000;
    if(seconds<60)return tr('Vừa xong');
    if(seconds<3600)return tr('{0} phút',[Math.floor(seconds/60)]);
    if(seconds<86400)return tr('{0} giờ',[Math.floor(seconds/3600)]);
    if(seconds<7*86400)return tr('{0} ngày',[Math.floor(seconds/86400)]);
    return formatMessageTimestamp(value,language).date;
  };
  const roleTag=(r:Role)=>r==='student'?null:<span className={`cm-role is-${r}`}>{tr(r==='admin'?'Admin':roles[r])}</span>;
  const summary=(post:CommunityPost)=>{
    const kinds=reactionKinds.filter(k=>post.reactions[k]>0).sort((a,b)=>post.reactions[b]-post.reactions[a]);
    const label=post.myReaction?post.reactionTotal>1?tr('Bạn và {0} người khác',[post.reactionTotal-1]):tr('Bạn'):String(post.reactionTotal);
    return {kinds,label};
  };

  function postMenu(post:CommunityPost,variant:'feed'|'row') {
    const key=`${variant}-${post.id}`;
    return <div className="cm-menu-wrap">
      <button type="button" className={`cm-menu-toggle ${variant==='row'?'cm-op':'cm-more'}`} aria-label={tr('Tùy chọn bài viết')} aria-expanded={menu===key} onClick={()=>setMenu(menu===key?'':key)}>⋯</button>
      {menu===key&&<div className="cm-menu" role="menu">
        {post.mine&&<button type="button" role="menuitem" onClick={()=>startEdit(post)}><UiIcon name="editor" size={16}/>{tr('Chỉnh sửa bài đăng')}</button>}
        {post.mine&&<button type="button" role="menuitem" onClick={()=>{setMenu('');void act(`comments-${post.id}`,{action:'comments',postId:post.id,off:!post.commentsOff})}}><UiIcon name="messages" size={16}/>{tr(post.commentsOff?'Bật bình luận':'Tắt bình luận')}</button>}
        <button type="button" role="menuitem" onClick={()=>void copyLink(post)}><UiIcon name="attachment" size={16}/>{tr('Sao chép liên kết')}</button>
        {post.canRemove&&<button type="button" role="menuitem" className="is-danger" onClick={()=>{setMenu('');setRemoving(post)}}><UiIcon name="close" size={16}/>{tr(post.mine?'Xoá bài viết':'Gỡ bài viết')}</button>}
      </div>}
    </div>;
  }
  function comment(post:CommunityPost,c:CommunityComment,reply=false) {
    return <div key={c.id} className={`cm-comment${reply?' is-reply':''}`}>
      <UserAvatar person={{...c.author,name:name(c.author)}} className="cm-avatar is-small"/>
      <div className="cm-comment-body">
        <div className="cm-bubble"><b>{name(c.author)}{roleTag(c.author.role)}</b><p>{c.body}</p>{c.likes>0&&<span className="cm-bubble-likes" aria-label={tr('{0} lượt yêu thích',[c.likes])}>❤️ {c.likes}</span>}</div>
        <div className="cm-comment-meta">
          <time dateTime={c.createdAt}>{ago(c.createdAt)}</time>
          <button type="button" className={c.liked?'is-on':''} aria-pressed={c.liked} disabled={!!busy} onClick={()=>void act(`like-${c.id}`,{action:'comment-like',commentId:c.id})}>{tr('Yêu thích')}</button>
          {!post.commentsOff&&<button type="button" onClick={()=>{setReplyTo(r=>({...r,[post.id]:{id:c.id,name:name(c.author)}}));document.getElementById(`comment-input-${post.id}`)?.focus()}}>{tr('Phản hồi')}</button>}
          {c.canDelete&&<button type="button" disabled={!!busy} onClick={()=>void act(`uncomment-${c.id}`,{action:'comment-remove',commentId:c.id})}>{tr('Xoá')}</button>}
        </div>
      </div>
    </div>;
  }
  function postCard(post:CommunityPost) {
    const {kinds,label}=summary(post),top=post.comments.filter(c=>!c.parentId),open=expanded[post.id],shown=open?top:top.slice(-2),hidden=post.commentCount-(open?post.commentCount:shown.reduce((n,c)=>n+1+post.comments.filter(r=>r.parentId===c.id).length,0));
    const mine=post.myReaction;
    return <article key={post.id} id={`post-${post.id}`} className="cm-card cm-post">
      <header className="cm-post-head">
        <UserAvatar person={{...post.author,name:name(post.author)}} className="cm-avatar"/>
        <div><b>{name(post.author)}{roleTag(post.author.role)}</b><small><time dateTime={post.createdAt} title={formatMessageTimestamp(post.createdAt,language).date}>{ago(post.createdAt)}</time>{post.edited&&<> · {tr('Đã chỉnh sửa')}</>}</small></div>
        {postMenu(post,'feed')}
      </header>
      {post.body&&<p className="cm-post-text">{post.body}</p>}
      {/* eslint-disable-next-line @next/next/no-img-element -- the image API needs the same-origin session cookie. */}
      {post.imageUrl&&<img className="cm-post-image" src={post.imageUrl} alt={tr('Ảnh của {0}',[name(post.author)])} loading="lazy"/>}
      {(post.reactionTotal>0||post.commentCount>0)&&<div className="cm-summary">
        {post.reactionTotal>0&&<span className="cm-faces" aria-label={kinds.map(k=>`${tr(reactionLabel[k])} ${post.reactions[k]}`).join(', ')}>{kinds.map(k=><i key={k} className={`is-${k}`}>{reactionFace[k]}</i>)}</span>}
        {post.reactionTotal>0&&<span>{label}</span>}
        {post.commentCount>0&&<button type="button" className="cm-summary-comments" onClick={()=>setExpanded(e=>({...e,[post.id]:!open}))}>{tr('{0} bình luận',[post.commentCount])}</button>}
      </div>}
      <div className="cm-actions">
        <div className="cm-react" onMouseEnter={()=>openPicker(post.id)} onMouseLeave={closePicker}>
          {picker===post.id&&<div className="cm-picker" role="group" aria-label={tr('Chọn cảm xúc')}>{reactionKinds.map(k=><button type="button" key={k} title={tr(reactionLabel[k])} aria-label={tr(reactionLabel[k])} aria-pressed={mine===k} onClick={()=>react(post,mine===k?null:k)}>{reactionFace[k]}</button>)}</div>}
          <button type="button" className={`cm-action${mine?` is-${mine}`:''}`} aria-pressed={!!mine} disabled={busy===`react-${post.id}`}
            onPointerDown={event=>{if(event.pointerType!=='mouse'){longPress.current=false;clearTimeout(pickerTimer.current);pickerTimer.current=setTimeout(()=>{longPress.current=true;setPicker(post.id)},450)}}}
            onPointerUp={()=>clearTimeout(pickerTimer.current)}
            onClick={()=>{if(longPress.current){longPress.current=false;return}react(post,mine?null:'like')}}
            onFocus={()=>setPicker('')}>
            {mine?<span aria-hidden="true">{reactionFace[mine]}</span>:<UiIcon name="thumbsUp" size={19}/>}{tr(mine?reactionLabel[mine]:'Thích')}
          </button>
        </div>
        <button type="button" className="cm-action" disabled={post.commentsOff&&!post.commentCount} onClick={()=>{setExpanded(e=>({...e,[post.id]:true}));setTimeout(()=>document.getElementById(`comment-input-${post.id}`)?.focus(),0)}}><UiIcon name="messages" size={19}/>{tr('Bình luận')}</button>
      </div>
      {(post.commentCount>0||!post.commentsOff)&&<div className="cm-comments">
        {hidden>0&&<button type="button" className="cm-more-comments" onClick={()=>setExpanded(e=>({...e,[post.id]:true}))}>{tr('Xem thêm {0} bình luận',[hidden])}</button>}
        {shown.map(c=><div key={c.id}>{comment(post,c)}{post.comments.filter(r=>r.parentId===c.id).map(r=>comment(post,r,true))}</div>)}
        {post.commentsOff?<p className="cm-closed">{tr('Tác giả đã tắt bình luận cho bài viết này.')}</p>:<form className="cm-comment-form" onSubmit={event=>void sendComment(post,event)}>
          <UserAvatar person={{...user,name:me}} className="cm-avatar is-small"/>
          <div className="cm-comment-field">
            {replyTo[post.id]&&<span className="cm-replying">{tr('Đang trả lời {0}',[replyTo[post.id]!.name])}<button type="button" aria-label={tr('Huỷ trả lời')} onClick={()=>setReplyTo(r=>({...r,[post.id]:undefined}))}><UiIcon name="close" size={13}/></button></span>}
            <label className="sr-only" htmlFor={`comment-input-${post.id}`}>{tr('Viết bình luận')}</label>
            <input id={`comment-input-${post.id}`} value={drafts[post.id]||''} maxLength={commentLimit} placeholder={tr('Viết bình luận…')} autoComplete="off" onChange={e=>setDrafts(d=>({...d,[post.id]:e.target.value}))}/>
            <button type="submit" aria-label={tr('Gửi bình luận')} disabled={!(drafts[post.id]||'').trim()||busy===`comment-${post.id}`}><UiIcon name="send" size={16}/></button>
          </div>
        </form>}
      </div>}
    </article>;
  }

  const minePosts=posts.filter(p=>p.mine&&(mineFilter==='all'||(mineFilter==='image'?!!p.imageUrl:p.commentsOff)));
  const draftPreview=(draft:Draft,setDraft:(d:Draft)=>void)=>draft.preview&&!draft.removeImage&&<div className="cm-preview">
    {/* eslint-disable-next-line @next/next/no-img-element -- local preview or the authenticated image API. */}
    <img src={draft.preview} alt={tr('Ảnh đính kèm')}/>
    <button type="button" aria-label={tr('Bỏ ảnh')} onClick={()=>setDraft({...draft,image:null,preview:null,removeImage:!!draft.id})}><UiIcon name="close" size={16}/></button>
  </div>;

  return <div className={`app-shell community-workspace ${role==='admin'?'admin-workspace':''} rail-workspace ${role!=='student'?'lecturer-workspace':''} ${role==='student'?'student-workspace':''}`}>
    <WorkspaceHeader sideNavigation mobileSideMenu={role!=='student'} homeHref={role==='admin'?adminHref('users'):role==='student'?'/student':lecturerHref('overview')} language={language} controls={<><button type="button" className="help-button" aria-label={tr('Hướng dẫn sử dụng')} onClick={()=>setHelp(value=>!value)}><UiIcon name="help"/></button><LanguageToggle language={language} onChange={setLanguage}/></>} profile={<WorkspaceProfile user={user} language={language} busy={!!busy} onLogout={()=>void logout()}/>}>
{role==='admin'?<AdminNavigation section="community" query={{}} language={language} busy={!!busy} user={user}/>:role==='lecturer'?<LecturerNavigation section="community" language={language} busy={!!busy}/>:<nav aria-label={tr('Điều hướng chính')}>{studentPages.map(page=><a key={page.key} href={viewPath(role,page.key)} title={tr(page.label)} className={page.key==='community'?'active':''} aria-current={page.key==='community'?'page':undefined}><UiIcon name={page.key}/><span>{tr(page.label)}</span>{page.key==='messages'&&<MessageUnreadBadge language={language}/>}</a>)}</nav>}
</WorkspaceHeader>
    <div className="main-shell">
      <main id="workspace-main" tabIndex={-1}>
        <div className="cm-feed">
          {help&&<div className="notice cm-help"><b>{tr('Bảng tin chung của toàn trường')}</b><p>{tr('Mọi sinh viên, giảng viên và quản trị viên đều đọc được bài đăng. Di chuột vào nút Thích để chọn cảm xúc khác. Giảng viên và quản trị viên có thể gỡ bài không phù hợp.')}</p></div>}
          {notice&&<div className="notice cm-notice" role="status"><span>{notice}</span><button type="button" className="icon-button" aria-label={tr('Đóng thông báo')} onClick={()=>setNotice('')}><UiIcon name="close" size={16}/></button></div>}
          {view==='feed'?<>
            <h1 className="cm-title">{tr('Cộng đồng')}</h1>
            <form className="cm-card cm-composer" onSubmit={event=>void savePost(composer,event)}>
              <div className="cm-composer-top">
                <UserAvatar person={{...user,name:me}} className="cm-avatar"/>
                <label className="sr-only" htmlFor="community-composer">{tr('Viết bài mới')}</label>
                <textarea id="community-composer" rows={composer.body?3:1} maxLength={postLimit} value={composer.body} placeholder={tr('{0} ơi, bạn đang nghĩ gì thế?',[me.split(' ').slice(-2).join(' ')])} onChange={e=>setComposer({...composer,body:e.target.value})}/>
              </div>
              {draftPreview(composer,setComposer)}
              <div className="cm-composer-actions">
                <input ref={fileInput} type="file" accept={imageTypes.join(',')} hidden onChange={e=>chooseImage(e,(image,preview)=>setComposer({...composer,image,preview,removeImage:false}))}/>
                <button type="button" className="cm-photo" onClick={()=>fileInput.current?.click()}><UiIcon name="attachment" size={18}/>{tr('Ảnh')}</button>
                {(composer.body.trim()||composer.image)&&<button type="submit" className="button primary cm-submit" disabled={busy==='post'}>{tr(busy==='post'?'Đang đăng…':'Đăng')}</button>}
              </div>
            </form>
            <div className="cm-sort">
              <h2>{tr('Bài đăng')}</h2>
              <div className="cm-menu-wrap">
                <button type="button" className="cm-menu-toggle cm-sort-button" aria-expanded={sortOpen} onClick={()=>setSortOpen(!sortOpen)}>{tr(sort==='top'?'Nhiều cảm xúc nhất':'Mới nhất')}<UiIcon name="chevron" size={15}/></button>
                {sortOpen&&<div className="cm-menu is-sort" role="menu">
                  {(['new','top'] as const).map(value=><button type="button" role="menuitemradio" aria-checked={sort===value} key={value} className={sort===value?'is-on':''} onClick={()=>changeSort(value)}><span aria-hidden="true">{value==='new'?'🕒':'🔥'}</span>{tr(value==='new'?'Mới nhất':'Nhiều cảm xúc nhất')}{sort===value&&<UiIcon name="check" size={15}/>}</button>)}
                  <button type="button" role="menuitem" className="is-manage" onClick={openMine}><span aria-hidden="true">✏️</span>{tr('Quản lý bài viết của tôi')}<UiIcon name="next" size={15}/></button>
                </div>}
              </div>
            </div>
            {busy==='load'&&!posts.length?<p className="cm-empty">{tr('Đang tải…')}</p>:posts.length?posts.map(postCard):<div className="cm-card cm-empty"><UiIcon name="community" size={28}/><p>{tr('Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ!')}</p></div>}
          </>:<>
            <div className="cm-manage-head"><button type="button" className="cm-back" aria-label={tr('Quay lại bảng tin')} onClick={openFeed}><UiIcon name="back" size={18}/></button><h1>{tr('Bài đăng của tôi')}</h1></div>
            <div className="cm-card cm-stats">
              <div><b>{posts.filter(p=>p.mine).length}</b><span>{tr('bài viết')}</span></div>
              <div><b>{posts.filter(p=>p.mine).reduce((n,p)=>n+p.reactionTotal,0)}</b><span>{tr('cảm xúc')}</span></div>
              <div><b>{posts.filter(p=>p.mine).reduce((n,p)=>n+p.commentCount,0)}</b><span>{tr('bình luận')}</span></div>
            </div>
            <div className="cm-filters" role="group" aria-label={tr('Lọc bài đăng')}>{([['all','Tất cả'],['image','Có ảnh'],['closed','Đã tắt bình luận']] as const).map(([key,label])=><button type="button" key={key} aria-pressed={mineFilter===key} className={mineFilter===key?'is-on':''} onClick={()=>setMineFilter(key)}>{tr(label)}</button>)}</div>
            {minePosts.length?<div className="cm-card cm-rows">{minePosts.map(post=><div key={post.id} className="cm-row">
              {/* eslint-disable-next-line @next/next/no-img-element -- the image API needs the same-origin session cookie. */}
              {post.imageUrl?<img className="cm-thumb" src={post.imageUrl} alt=""/>:<span className="cm-thumb is-text" aria-hidden="true">📝</span>}
              <div className="cm-row-body">
                <a href={communityHref(role,post.id)} onClick={event=>{event.preventDefault();setView('feed');void load(sort,false).then(()=>setTimeout(()=>document.getElementById(`post-${post.id}`)?.scrollIntoView({block:'center'}),50))}}>{post.body||tr('Bài viết chỉ có ảnh')}</a>
                <div className="cm-row-meta"><span>{ago(post.createdAt)}</span><span>{reactionKinds.filter(k=>post.reactions[k]).map(k=>reactionFace[k]).join('')} {post.reactionTotal}</span><span>💬 {post.commentCount}</span>{post.edited&&<span>· {tr('Đã chỉnh sửa')}</span>}{post.commentsOff&&<span className="is-off">{tr('Đã tắt bình luận')}</span>}</div>
              </div>
              <div className="cm-row-ops"><button type="button" className="cm-op" onClick={()=>startEdit(post)}>{tr('Sửa')}</button>{postMenu(post,'row')}</div>
            </div>)}</div>:<div className="cm-card cm-empty"><p>{tr(busy==='load'?'Đang tải…':'Chưa có bài viết phù hợp.')}</p></div>}
          </>}
        </div>
        <SiteFooter language={language} compact onHelp={()=>setHelp(!help)}/>
      </main>
    </div>
    {editing&&<div className="modal-backdrop">
      <form className="modal cm-modal" role="dialog" aria-modal="true" aria-label={tr('Chỉnh sửa bài đăng')} onSubmit={event=>void savePost(editing,event)}>
        <div className="modal-header"><h3>{tr('Chỉnh sửa bài đăng')}</h3><button type="button" className="close-button" aria-label={tr('Đóng')} onClick={()=>setEditing(null)}><UiIcon name="close"/></button></div>
        <div className="modal-body">
          <label className="sr-only" htmlFor="community-edit">{tr('Nội dung bài viết')}</label>
          <textarea id="community-edit" rows={5} maxLength={postLimit} value={editing.body} onChange={e=>setEditing({...editing,body:e.target.value})}/>
          {draftPreview(editing,setEditing)}
        </div>
        <div className="cm-modal-foot">
          <input ref={editFile} type="file" accept={imageTypes.join(',')} hidden onChange={e=>chooseImage(e,(image,preview)=>setEditing({...editing,image,preview,removeImage:false}))}/>
          <button type="button" className="cm-op" onClick={()=>editFile.current?.click()}><UiIcon name="attachment" size={16}/>{tr(editing.preview&&!editing.removeImage?'Đổi ảnh':'Thêm ảnh')}</button>
          <span className="cm-spacer"/>
          <button type="button" className="button" onClick={()=>setEditing(null)}>{tr('Huỷ')}</button>
          <button type="submit" className="button primary" disabled={busy==='edit'}>{tr(busy==='edit'?'Đang lưu…':'Lưu')}</button>
        </div>
      </form>
    </div>}
    {removing&&<div className="modal-backdrop">
      <div className="modal cm-confirm" role="alertdialog" aria-modal="true" aria-labelledby="cm-remove-title">
        <h3 id="cm-remove-title">{tr(removing.mine?'Xoá bài viết?':'Gỡ bài viết này?')}</h3>
        <p>{tr('Bài viết cùng toàn bộ cảm xúc và bình luận sẽ bị xoá vĩnh viễn.')}</p>
        <div className="cm-modal-foot"><span className="cm-spacer"/><button type="button" className="button" onClick={()=>setRemoving(null)}>{tr('Huỷ')}</button><button type="button" className="button cm-danger" disabled={busy==='remove'} onClick={()=>void confirmRemove()}>{tr(removing.mine?'Xoá':'Gỡ bài')}</button></div>
      </div>
    </div>}
  </div>;
}
