'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { translate, languageCookie, type Language } from '../lib/i18n';
import type { User } from '../lib/domain';
import UiIcon from './UiIcon';
import LanguageToggle from './LanguageToggle';
import Link from 'next/link';
import PublicHome from './PublicHome';
import SiteFooter from './SiteFooter';
import { usePageReveal } from './usePageReveal';

type Screen = 'home' | 'login' | 'register' | 'setup';
type AuthState = {user:User|null;setup:Pick<User,'name'|'email'|'role'>|null;redirect:string|null};
const emptyAuth:AuthState={user:null,setup:null,redirect:null};

export default function PublicSite({initialLanguage,screen='home'}:{initialLanguage:Language;screen?:Screen}) {
  const [language,setLanguage]=useState(initialLanguage),[auth,setAuth]=useState<AuthState>(emptyAuth),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[showPassword,setShowPassword]=useState(false);
  const [scrolled,setScrolled]=useState(false),[menuOpen,setMenuOpen]=useState(false);
  const siteRef=usePageReveal(),menuRef=useRef<HTMLElement>(null),menuButtonRef=useRef<HTMLButtonElement>(null);
  const [name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState('');
  const tr=(text:string)=>translate(text,language);
  useEffect(()=>{let active=true;fetch('/api/auth',{cache:'no-store'}).then(async response=>{const data=await response.json() as AuthState & {error?:string};if(!response.ok)throw new Error(data.error);if(active)setAuth(data)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoaded(true)});return()=>{active=false}},[]);
  useEffect(()=>{
    document.documentElement.lang=language;
    document.title=translate('THINK UP · Không gian phát triển năng lực phản tư',language);
    document.cookie=languageCookie+'='+language+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');
  },[language]);
  useEffect(()=>{const update=()=>setScrolled(window.scrollY>24);update();window.addEventListener('scroll',update,{passive:true});return()=>window.removeEventListener('scroll',update)},[]);
  useEffect(()=>{
    if(!menuOpen)return;
    menuRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape'){setMenuOpen(false);menuButtonRef.current?.focus()}};
    window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);
  },[menuOpen]);
  function changeLanguage(next:Language){setLanguage(next)}
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setError('');
    if(screen!=='login'&&password!==confirmation){setError('Mật khẩu xác nhận chưa khớp.');return}
    setBusy(true);
    try{const response=await fetch(`/api/auth/${screen}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(screen==='setup'?{password}:screen==='register'?{name,email,password}:{email,password})});const result=await response.json() as {error?:string;redirect:string};if(!response.ok)throw new Error(result.error||'Thao tác chưa hoàn tất.');location.assign(result.redirect)}catch(e){setError(e instanceof Error?e.message:'Thao tác chưa hoàn tất.');setBusy(false)}
  }
  const isRegister=screen==='register',isSetup=screen==='setup';
  const continueHref=auth.user?auth.redirect||'/workspace':'/register';
  return <div id="page-top" ref={siteRef} className={`public-site ${screen==='home'?'':'is-auth'}`}>
    <a className="skip-link" href="#main-content">{tr('Đi đến nội dung chính')}</a>
    <header className={`public-header ${scrolled?'is-scrolled':''} ${menuOpen?'menu-open':''}`}>
      <Link className="brand" href="/" aria-label="THINK UP">think<span>up</span><i><UiIcon name="arrow" size={18}/></i></Link>
      {screen==='home'&&<nav id="public-navigation" ref={menuRef} className={menuOpen?'is-open':''} aria-label={tr('Điều hướng chính')} onClickCapture={event=>{if((event.target as Element).closest('a'))setMenuOpen(false)}}><Link href="/#how-it-works">{tr('Cách hoạt động')}</Link><Link href="/#for-you">{tr('Dành cho bạn')}</Link><Link href="/#questions">{tr('Câu hỏi thường gặp')}</Link></nav>}
      <div className="public-controls"><LanguageToggle language={language} onChange={changeLanguage} disabled={busy}/>{screen==='home'&&(auth.user?<Link className="button primary public-account" href={auth.redirect||'/workspace'}>{tr('Vào không gian của tôi')}<UiIcon name="arrow" size={16}/></Link>:<><Link className="public-login" href="/login">{tr('Đăng nhập')}</Link><Link className="button primary public-account" href="/register">{tr('Bắt đầu')}<UiIcon name="arrow" size={16}/></Link></>)}
        {screen==='home'&&<button ref={menuButtonRef} className="public-menu-toggle" aria-label={tr(menuOpen?'Đóng menu':'Mở menu')} aria-controls="public-navigation" aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}><UiIcon name={menuOpen?'close':'menu'}/></button>}
      </div>
    </header>
    {screen==='home'?<PublicHome language={language} continueHref={continueHref} hasAccount={!!auth.user}/>:<main id="main-content" tabIndex={-1} className="auth-main"><section className="auth-story"><span className="eyebrow">THINK UP · REFLECTIVE GROWTH</span><h1>{tr('Một nơi để học.')}<br/><em>{tr('Một cách để tiến bộ.')}</em></h1><p>{tr('Lưu lại trải nghiệm, kết nối bài học và theo dõi thay đổi qua từng tuần.')}</p><div className="auth-journal-note"><span className="auth-note-label"><UiIcon name="editor" size={16}/>{tr('Một trải nghiệm. Bốn góc nhìn.')}</span><p>{tr('Hôm nay, bạn đã học được điều gì về mình?')}</p><span className="auth-note-sections">WHAT? <i/> SO WHAT? <i/> NOW WHAT? <i/> ACTION</span></div><span className="auth-story-signature">{tr('Bạn tự viết. THINK UP đồng hành.')}</span></section><section className="auth-card" aria-labelledby="auth-title"><span className="eyebrow">{tr(isSetup?'TÀI KHOẢN HIỆN CÓ':isRegister?'BẮT ĐẦU HÀNH TRÌNH':'CHÀO MỪNG TRỞ LẠI')}</span><h2 id="auth-title">{tr(isSetup?'Kích hoạt đăng nhập bằng email':isRegister?'Tạo tài khoản của bạn':'Đăng nhập THINK UP')}</h2><p className="auth-description">{tr(isSetup?'Đặt mật khẩu cho tài khoản đã được xác thực. Bài viết và vai trò hiện có được giữ nguyên.':isRegister?'Tạo tài khoản để bắt đầu hành trình phản tư của bạn.':'Chào mừng bạn quay lại. Đăng nhập để tiếp tục hành trình.')}</p>
      {auth.user?<div className="auth-signed-in"><span className="badge final">{tr('Bạn đã đăng nhập')}</span><p>{auth.user.name}<small>{auth.user.email}</small></p><Link className="button primary full" href={auth.redirect||'/workspace'}>{tr('Vào không gian của tôi')} ↗</Link></div>:isSetup&&!loaded?<p role="status">{tr('Đang kiểm tra tài khoản…')}</p>:isSetup&&!auth.setup?<div className="notice"><p>{tr('Tài khoản chưa được xác thực hoặc đã có mật khẩu. Hãy đăng nhập, hoặc xác thực tài khoản hiện có để kích hoạt.')}</p><Link className="button" href="/login">{tr('Đăng nhập')}</Link><Link className="text-button" href="/signin-with-chatgpt?return_to=%2Fsetup">{tr('Xác thực tài khoản hiện có')} ↗</Link></div>:<form onSubmit={submit} aria-busy={busy}>
        {isRegister&&<label className="field">{tr('Họ và tên')}<input autoComplete="name" required maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder={tr('Tên của bạn')} disabled={busy}/></label>}
        <label className="field">Email<input type="email" autoComplete="username" required maxLength={254} value={isSetup?auth.setup?.email||'':email} onChange={e=>setEmail(e.target.value)} placeholder="name@university.edu" readOnly={isSetup} disabled={busy}/></label>
        <label className="field">{tr('Mật khẩu')}<div className="password-field"><input type={showPassword?'text':'password'} autoComplete={screen==='login'?'current-password':'new-password'} required minLength={screen==='login'?undefined:12} maxLength={72} value={password} onChange={e=>setPassword(e.target.value)} placeholder={tr(screen==='login'?'Nhập mật khẩu của bạn':'Ít nhất 12 ký tự')} disabled={busy}/><button type="button" aria-label={tr(showPassword?'Ẩn mật khẩu':'Hiện mật khẩu')} aria-pressed={showPassword} onClick={()=>setShowPassword(!showPassword)}>{tr(showPassword?'Ẩn':'Hiện')}</button></div></label>
        {screen!=='login'&&<><small className="password-hint">{tr('Dùng ít nhất 12 ký tự. Mật khẩu có dấu được tính theo giới hạn 72 byte.')}</small><label className="field">{tr('Xác nhận mật khẩu')}<input type={showPassword?'text':'password'} autoComplete="new-password" required minLength={12} maxLength={72} value={confirmation} onChange={e=>setConfirmation(e.target.value)} placeholder={tr('Nhập lại mật khẩu')} disabled={busy}/></label></>}
        {error&&<p className="auth-error" role="alert">{tr(error)}</p>}
        <button className="button primary full" disabled={busy}>{tr(busy?'Đang xử lý…':isSetup?'Đặt mật khẩu và tiếp tục':isRegister?'Đăng ký và bắt đầu':'Đăng nhập')} <UiIcon name="next" size={18}/></button>
        {isRegister&&<p className="auth-role-note">{tr('Quyền giảng viên và admin do quản trị viên cấp sau khi kiểm tra tài khoản.')}</p>}
      </form>}
      {!auth.user&&<div className="auth-links"><p>{tr(isRegister?'Đã có tài khoản?':'Chưa có tài khoản?')} <Link href={isRegister?'/login':'/register'}>{tr(isRegister?'Đăng nhập':'Đăng ký')}</Link></p>{!isSetup&&auth.setup&&<Link className="setup-link" href="/setup">{tr('Kích hoạt tài khoản hiện có')} ↗</Link>}</div>}
    </section></main>}
    {screen==='home'?<SiteFooter language={language}/>:<footer className="auth-page-footer"><span>© {new Date().getFullYear()} THINK UP</span><span>{tr('Bạn tự viết. THINK UP đồng hành.')}</span><Link href="/">{tr('Về trang chủ')}<UiIcon name="arrow" size={13}/></Link></footer>}
  </div>;
}
