'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {defaultPermissions,permissionDefinitions,roleKeys,toggleRolePermission,type PermissionPolicy,type RolePermissions} from '../lib/permissions';
import type {Role} from '../lib/access';
import {roles} from '../lib/domain';
import {translate,type Language} from '../lib/i18n';
import {useUnsavedChanges} from './useUnsavedChanges';

async function fetchPolicy(signal?:AbortSignal):Promise<PermissionPolicy>{
  const response=await fetch('/api/learning?mode=permissions',{cache:'no-store',signal}),value=await response.json() as PermissionPolicy&{error?:string};
  if(!response.ok)throw new Error(value.error);return value;
}

export default function AdminPermissions({language,active,onSaved,initialPolicy}:{language:Language;active:boolean;initialPolicy?:PermissionPolicy;onSaved:()=>Promise<void>}){
  const tr=(text:string)=>translate(text,language);
  const [policy,setPolicy]=useState<PermissionPolicy|null>(initialPolicy||null),[draft,setDraft]=useState<RolePermissions>(()=>initialPolicy?structuredClone(initialPolicy.roles):defaultPermissions());
  const [role,setRole]=useState<Role>('student'),[loading,setLoading]=useState(!initialPolicy),[saving,setSaving]=useState(false),[changed,setChanged]=useState(false);
  const [notice,setNotice]=useState<{text:string;error?:boolean}|null>(null),{markChanged,markSaved}=useUnsavedChanges();
  function apply(value:PermissionPolicy){setPolicy(value);setDraft(structuredClone(value.roles));setChanged(false);markSaved()}
  async function load(){
    setLoading(true);setNotice(null);
    try{apply(await fetchPolicy())}catch(e){setNotice({text:e instanceof Error?e.message:'Thao tác chưa hoàn tất.',error:true})}finally{setLoading(false)}
  }
  useEffect(()=>{if(!active||policy)return;const controller=new AbortController();fetchPolicy(controller.signal).then(value=>{if(!controller.signal.aborted){setPolicy(value);setDraft(structuredClone(value.roles));setChanged(false);setLoading(false)}}).catch(e=>{if(!controller.signal.aborted){setNotice({text:e instanceof Error?e.message:'Thao tác chưa hoàn tất.',error:true});setLoading(false)}});return()=>controller.abort()},[active,policy]);
  function edit(next:RolePermissions){setDraft(next);setChanged(true);markChanged();setNotice(null)}
  async function save(event:FormEvent){
    event.preventDefault();if(!policy||saving)return;setSaving(true);setNotice(null);
    try{const res=await fetch('/api/learning',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'permissions-save',roles:draft,revision:policy.revision})}),value=await res.json() as {policy:PermissionPolicy;error?:string};if(!res.ok)throw new Error(value.error);setPolicy(value.policy);setDraft(structuredClone(value.policy.roles));setChanged(false);markSaved();setNotice({text:'Đã lưu phân quyền. Các quyền mới có hiệu lực từ yêu cầu tiếp theo.'});await onSaved()}
    catch(e){setNotice({text:e instanceof Error?e.message:'Thao tác chưa hoàn tất.',error:true})}finally{setSaving(false)}
  }
  return <form className="admin-permissions" onSubmit={save}>
    <header className="admin-settings-head"><div><h2>{tr('Quyền theo vai trò')}</h2><p>{tr('Bật để cấp quyền, tắt để gỡ quyền cho tất cả tài khoản cùng vai trò.')}</p></div><button className="lx-btn is-primary" disabled={!policy||!changed||saving}>{tr(saving?'Đang lưu…':'Lưu phân quyền')}</button></header>
    {notice&&<p className={`lx-notice${notice.error?' is-error':''}`} role={notice.error?'alert':'status'}>{tr(notice.text)}</p>}
    {!policy?<div className="admin-settings-loading">{loading?<p role="status">{tr('Đang tải…')}</p>:<button type="button" className="lx-btn" onClick={()=>void load()}>{tr('Tải lại')}</button>}</div>:<>
      <div className="admin-role-tabs" role="group" aria-label={tr('Chọn vai trò')}>{roleKeys.map(key=><button key={key} type="button" aria-pressed={role===key} disabled={saving} onClick={()=>setRole(key)}><b>{tr(roles[key])}</b><span>{draft[key].length} / {permissionDefinitions.filter(p=>(p.roles as readonly string[]).includes(key)).length}</span></button>)}</div>
      <div className="admin-role-heading"><p>{tr(role==='student'?'Phạm vi: bài viết và dữ liệu của bản thân.':role==='lecturer'?'Phạm vi: các học phần được phân công.':'Phạm vi: cấu hình và quản trị hệ thống.')}</p><button type="button" className="lx-link" disabled={saving} onClick={()=>edit({...draft,[role]:defaultPermissions()[role]})}>{tr('Khôi phục quyền mặc định')}</button></div>
      <fieldset className="admin-permission-list" disabled={saving}>{permissionDefinitions.filter(p=>(p.roles as readonly string[]).includes(role)).map(permission=>{const locked='locked' in permission&&permission.locked;return <label key={permission.key} className="admin-permission-row"><span><b>{tr(permission.label)}</b><small>{tr(permission.description)}</small></span><span className="admin-permission-control">{locked&&<small>{tr('Luôn bật')}</small>}<input type="checkbox" role="switch" checked={draft[role].includes(permission.key)} disabled={locked} onChange={e=>edit(toggleRolePermission(draft,role,permission.key,e.target.checked))}/></span></label>})}</fieldset>
      <footer className="admin-permissions-footer"><span role="status">{tr(changed?'Có thay đổi chưa lưu':'Đã lưu')}</span>{changed&&<button type="button" className="lx-btn" disabled={saving} onClick={()=>{setDraft(structuredClone(policy.roles));setChanged(false);markSaved();setNotice(null)}}>{tr('Hủy thay đổi')}</button>}<button type="button" className="lx-btn" disabled={changed||saving} onClick={()=>void load()}>{tr('Làm mới')}</button></footer>
    </>}
  </form>;
}
