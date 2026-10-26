'use client';
import { useEffect, useState } from 'react';
import type { Data } from '../lib/domain';
import { adminHref } from '../lib/admin-pages';
import { demoText } from '../lib/demo-i18n';
import { stageLabel, translate, type Language } from '../lib/i18n';
import type { LecturerMutation } from './LecturerWorkspace';
import UiIcon from './UiIcon';
import { CourseSettings } from './LecturerCourses';
import { Section, Tabbed, formatDate } from './LecturerKit';
import { safeCsv } from '../lib/lecturer-pages';
import TablePagination, { usePageRows } from './TablePagination';
import AdminPermissions from './AdminPermissions';
import {hasPermission} from '../lib/permissions';

type Audit={id:string;user_id:string;action:string;target_id:string;created_at:string;actor_name?:string;target_label?:string};
type Governance={audit:Audit[]};

// Readable names for the actions recorded in the audit log; reflection stages reuse the version stage labels.
const auditActions:Record<string,string>={review:'Đánh giá bài viết','review-draft-save':'Lưu nháp đánh giá','course-save':'Lưu cấu hình học phần','config-save':'Lưu cấu hình mặc định',invite:'Phân công bằng email','invite-approve':'Duyệt phân công','invite-remove':'Hủy phân công','membership-remove':'Gỡ phân công học phần','user-save':'Cập nhật tài khoản','User created':'Tạo tài khoản','Account activated':'Kích hoạt tài khoản','Account registered':'Đăng ký tài khoản','action-save':'Cập nhật cam kết','action-evidence-upload':'Tải minh chứng hành động','self-assess':'Tự đánh giá','template-save':'Lưu mẫu nhận xét','template-remove':'Xóa mẫu nhận xét','retention-save':'Lưu chính sách lưu trữ','incident-save':'Ghi nhận sự cố','lecturer-analysis':'Yêu cầu AI đề xuất','reading-analyze':'Phân tích sơ bộ bài viết','similarity-check':'Kiểm tra trùng lặp','ai-analysis-request':'Gửi yêu cầu phân tích AI'};
const auditTargets:Record<string,string>={'assigned-courses':'Các học phần được phân công',system:'Hệ thống'};
async function fetchGovernance():Promise<Governance>{
  const response=await fetch('/api/learning?mode=audit',{cache:'no-store'}),value=await response.json() as Governance&{error?:string};
  if(!response.ok)throw new Error(value.error);return value;
}

/** Defaults, role permissions and audit history, one topic per tab. */
export default function AdminSettings({data,language,busy,initialTab,onMutate,onReload}:{data:Data;language:Language;busy:string;initialTab?:string;onMutate:LecturerMutation;onReload:()=>Promise<void>}) {
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  const [tab,setTab]=useState(['defaults','permissions','audit'].includes(initialTab||'')?initialTab!:'defaults');
  const [loading,setLoading]=useState(initialTab==='audit'),[auditSearch,setAuditSearch]=useState(''),[auditAction,setAuditAction]=useState('');
  const [state,setState]=useState<Governance|null>(null);
  const [message,setMessage]=useState<{text:string;error?:boolean}|null>(null);
  async function load(){setLoading(true);try{setState(await fetchGovernance())}finally{setLoading(false)}}
  useEffect(()=>{if(tab!=='audit'||state||!hasPermission(data.user,'audit.read'))return;let alive=true;fetchGovernance().then(value=>{if(alive){setState(value);setLoading(false)}}).catch(e=>{if(alive){setMessage({text:e instanceof Error?e.message:'Thao tác chưa hoàn tất.',error:true});setLoading(false)}});return()=>{alive=false}},[tab,state,data.user]);
  function changeTab(next:string){if(next==='audit'&&!state)setLoading(true);setTab(next);setMessage(null);history.replaceState({},'',adminHref('settings',{settingsTab:next}))}
  const time=(value:string)=>formatDate(value,language,true);
  const actionName=(action:string)=>action==='permissions-save'?tr('Lưu phân quyền'):auditActions[action]?tr(auditActions[action]):stageLabel(action,language);
  const targetName=(a:Audit)=>a.target_label?demoText(a.target_label,a.target_id,language):auditTargets[a.target_id]?tr(auditTargets[a.target_id]):/^[0-9a-f-]{36}$/.test(a.target_id)?'—':a.target_id;
  const visibleAudit=(state?.audit||[]).filter(a=>(!auditAction||a.action===auditAction)&&`${a.actor_name||a.user_id} ${actionName(a.action)} ${targetName(a)}`.toLowerCase().includes(auditSearch.trim().toLowerCase()));
  const pagination=usePageRows(visibleAudit,JSON.stringify([auditSearch,auditAction]));
  function exportAudit(){const csv=safeCsv([[tr('Thời gian'),tr('Người thực hiện'),tr('Thao tác'),tr('Đối tượng')],...visibleAudit.map(a=>[time(a.created_at),a.actor_name||a.user_id,actionName(a.action),targetName(a)])]);const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='think-up-audit.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  const notice=message&&<p className={`lx-notice${message.error?' is-error':''}`} role={message.error?'alert':'status'}>{tr(message.text)}</p>;
  return <div className="lx-stack">{notice}<Tabbed label={tr('Cài đặt & quyền truy cập')} activeKey={tab} onChange={changeTab} tabs={[
    {key:'defaults',label:tr('Cấu hình mặc định'),content:hasPermission(data.user,'defaults.manage')?<CourseSettings system key={'system'+language} course={{id:'__system',name:'',code:'',weeks:data.weeks,rubric:data.rubric}} records={[]} language={language} busy={busy} onMutate={onMutate}/>:<p className="lx-notice">{tr('Vai trò của bạn chưa được cấp quyền thực hiện thao tác này.')}</p>},
    {key:'permissions',label:tr('Phân quyền'),content:<AdminPermissions initialPolicy={data.permissionPolicy} language={language} active={tab==='permissions'} onSaved={onReload}/>},
    {key:'audit',label:tr('Nhật ký thao tác'),count:state?.audit.length,content:hasPermission(data.user,'audit.read')?<Section>
      <div className="lx-filters"><input aria-label={tr('Tìm trong nhật ký')} placeholder={tr('Tìm người thực hiện, thao tác hoặc đối tượng')} value={auditSearch} onChange={e=>setAuditSearch(e.target.value)}/><select aria-label={tr('Lọc thao tác')} value={auditAction} onChange={e=>setAuditAction(e.target.value)}><option value="">{tr('Tất cả thao tác')}</option>{[...new Set(state?.audit.map(a=>a.action))].map(action=><option value={action} key={action}>{actionName(action)}</option>)}</select><button type="button" className="lx-btn" disabled={loading} onClick={()=>void load().catch(e=>setMessage({text:e instanceof Error?e.message:'Thao tác chưa hoàn tất.',error:true}))}>{tr('Làm mới')}</button><button type="button" className="lx-btn" disabled={!visibleAudit.length} onClick={exportAudit}><UiIcon name="down" size={15}/>{tr('Xuất CSV')}</button></div>
      <div className="lx-table-wrap"><table className="lx-table"><thead><tr><th>{tr('Thời gian')}</th><th>{tr('Người thực hiện')}</th><th>{tr('Thao tác')}</th><th>{tr('Đối tượng')}</th></tr></thead>
        <tbody>{pagination.rows.map(a=><tr key={a.id}><td className="lx-muted">{time(a.created_at)}</td><td>{a.actor_name||a.user_id}</td><td>{actionName(a.action)}</td><td>{targetName(a)}</td></tr>)}</tbody></table>
        {loading?<p className="lx-empty-line" role="status">{tr('Đang tải…')}</p>:state&&!visibleAudit.length&&<p className="lx-empty-line">{tr('Không có thao tác phù hợp bộ lọc.')}</p>}<TablePagination {...pagination} total={visibleAudit.length} language={language}/></div>
      <p className="lx-footnote">{tr('Hiển thị 200 thao tác gần nhất.')}</p>
    </Section>:<p className="lx-notice">{tr('Vai trò của bạn chưa được cấp quyền thực hiện thao tác này.')}</p>},
  ]}/></div>;
}
