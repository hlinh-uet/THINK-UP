'use client';
import { useEffect, useRef, useState } from 'react';
import { homePath, type Role } from '../lib/access';
import type { Data } from '../lib/domain';
import { demoText } from '../lib/demo-i18n';
import { languageCookie, translate, type Language } from '../lib/i18n';
import { lecturerHref, lecturerPages, lecturerScope, safeCsv, type LecturerQuery, type LecturerSection } from '../lib/lecturer-pages';
import { currentFeedback, finalReview, learnerProgress } from '../lib/progress';
import { criterionLevel } from '../lib/assessment';
import { reportHeaders, reportRows } from '../lib/learning-analytics';
import UiIcon from './UiIcon';
import WorkspaceProfile from './WorkspaceProfile';
import WorkspaceHeader from './WorkspaceHeader';
import LanguageToggle from './LanguageToggle';
import { useAIProvider } from './AIProviderSelect';
import LecturerNavigation from './LecturerNavigation';
import CoursePicker from './CoursePicker';
import ClassPicker from './ClassPicker';
import LecturerOverview from './LecturerOverview';
import LecturerSubmissions, { type SubmissionFilters } from './LecturerSubmissions';
import LecturerAnalytics from './LecturerAnalytics';
import LecturerStudents from './LecturerStudents';
import LecturerReview from './LecturerReview';
import LecturerCourses from './LecturerCourses';
import SimilarityPanel from './SimilarityPanel';
import RoleHelp from './RoleHelp';

export type LecturerMutation = (body: Record<string, unknown>, message: string) => Promise<boolean>;

const statusKeys=['submitted','returned','final','all'];

/** Teaching assignments, submissions, assessment and student progress. */
export default function LecturerWorkspace({initialData,initialLanguage,section,query,reflectionId}: {
  initialData: Data; initialLanguage: Language; section: LecturerSection; query: LecturerQuery; reflectionId?: string;
}) {
  const href=(target:string,next:LecturerQuery={},id?:string)=>lecturerHref(target as LecturerSection,next,id);
  const [data,setData]=useState(initialData), [language,setLanguage]=useState(initialLanguage);
  const {provider:aiProvider}=useAIProvider(data);
  const [busy,setBusy]=useState(''), [notice,setNotice]=useState<{text:string;error:boolean}|null>(null), [help,setHelp]=useState(false);
  const [hasUnsaved,setHasUnsaved]=useState(false);
  const helpRef=useRef<HTMLElement>(null);
  const [filters,setFilters]=useState<SubmissionFilters>(()=>({
    status:statusKeys.includes(query.status||'')?query.status!:'submitted',
    week:/^[1-9]$/.test(query.week||'')?query.week!:'', q:query.q||'',
    criterion:query.criterion||'', level:query.level||'', sort:query.sort||'oldest',
  }));
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  const dt=(text:string,id?:string|null)=>demoText(text,id,language);
  const assigned=lecturerScope(data);
  const classes=[...new Set(assigned.courses.map(c=>c.className||c.code))];
  const scope=lecturerScope(data,query.course,query.cohort);
  // The in-page comparison filters can switch courses within the selected class.
  const similarityScope=section==='similarity'?lecturerScope(data,'',query.cohort):scope;
  const rubric=scope.courses.find(c=>c.id===query.course)?.rubric||data.rubric;
  const row=scope.reflections.find(r=>r.id===reflectionId);
  const page=lecturerPages.find(p=>p.key===section)!;
  const common={course:query.course,cohort:query.cohort};
  const workspaceUrl='/api/thinkup';
  const listQuery={...common,status:filters.status,week:filters.week,q:filters.q,criterion:filters.criterion,level:filters.level,sort:filters.sort};
  const detailHref=(id:string)=>href('submissions',{...listQuery,student:query.student},id);
  const studentHref=(id:string)=>href('students',{...common,student:id});

  useEffect(()=>{
    if(section!=='submissions'||reflectionId)return;
    history.replaceState({},'',href('submissions',listQuery));
    // listQuery is derived from the values below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[section,reflectionId,query.course,query.cohort,filters]);
  // A click anywhere on a table row follows the row's main link. Done here rather than with a stretched ::after,
  // which Safari does not contain inside the row and so covers the page above the table.
  useEffect(()=>{
    const main=document.getElementById('workspace-main');
    function openRow(event:MouseEvent){
      const target=event.target as HTMLElement;
      if(event.defaultPrevented||event.button!==0||target.closest('a,button,input,select,textarea,label,summary')||window.getSelection()?.toString())return;
      const link=target.closest('.lx-table tbody tr')?.querySelector<HTMLAnchorElement>('a.lx-row-link');
      if(!link)return;
      if(event.metaKey||event.ctrlKey)window.open(link.href,'_blank');else link.click();
    }
    main?.addEventListener('click',openRow);
    return()=>main?.removeEventListener('click',openRow);
  },[]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(null),7000);return()=>clearTimeout(timer)},[notice]);
  useEffect(()=>{const change=(event:Event)=>setHasUnsaved(!!(event as CustomEvent<boolean>).detail);window.addEventListener('thinkup:unsaved',change);return()=>window.removeEventListener('thinkup:unsaved',change)},[]);
  useEffect(()=>{if(!help)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setHelp(false)};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[help]);
  useEffect(()=>{if(help){helpRef.current?.scrollIntoView({behavior:'smooth',block:'start'});helpRef.current?.focus({preventScroll:true})}},[help]);
  useEffect(()=>{
    document.documentElement.lang=language;
    document.title=translate(page.label,language)+' · THINK UP';
    document.cookie=languageCookie+'='+language+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');
  },[language,page.label]);

  const mutate:LecturerMutation=async(body,message)=>{
    setBusy(String(body.action));
    try {
      const response=await fetch('/api/thinkup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,language,aiProvider})});
      const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error||'Thao tác chưa hoàn tất.');
      // The mutation is committed even if the subsequent refresh loses its connection.
      try{
        const refreshed=await fetch(workspaceUrl,{cache:'no-store'}),fresh=await refreshed.json() as Data;
        if(refreshed.ok&&fresh.user?.role==='lecturer')setData(fresh);
        else if(refreshed.status===401||refreshed.status===403||!fresh.user)location.assign('/login');
        else if(fresh.user.role!=='lecturer')location.assign(homePath(fresh.user.role as Role));
      }catch{/* The next route reloads authoritative data; do not report a saved grade as failed. */}
      setNotice({text:message,error:false});return true;
    } catch(error) {setNotice({text:error instanceof Error?error.message:'Thao tác chưa hoàn tất.',error:true});return false}
    finally {setBusy('')}
  };
  async function logout() {
    if(hasUnsaved){setNotice({text:'Hãy lưu thay đổi hiện tại trước khi đăng xuất.',error:true});return}
    setBusy('logout');
    try{const response=await fetch('/api/auth/logout',{method:'POST'});if(!response.ok)throw new Error();location.assign('/')}
    catch{setNotice({text:'Chưa thể đăng xuất. Vui lòng thử lại.',error:true});setBusy('')}
  }
  function exportReport() {
    const rows=scope.reflections.filter(r=>(section!=='students'||!query.student||r.userId===query.student));
    const content=safeCsv([reportHeaders.map(label=>tr(label)),...reportRows(rows,rubric)]);
    const url=URL.createObjectURL(new Blob(['﻿'+content],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='think-up-lecturer.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  const visible=scope.reflections.filter(r=>{
    const review=finalReview(r),proposal=currentFeedback(r),index=rubric.findIndex(c=>c.key===filters.criterion);
    const actual=index<0?null:review?.criteria?.[index]?.level||(review?(review.scoreScale===10?criterionLevel(review.scores[index]):review.scores[index]):proposal?.result.criteria[index]?.level);
    return (filters.status==='all'||r.status===filters.status)&&(!query.student||r.userId===query.student)&&(!filters.week||r.week===Number(filters.week))
      &&`${dt(r.title,r.id)} ${r.studentName} ${r.studentEmail}`.toLowerCase().includes(filters.q.trim().toLowerCase())
      &&(!filters.criterion||!filters.level||actual===Number(filters.level));
  }).sort((a,b)=>filters.sort==='name'?(a.studentName||'').localeCompare(b.studentName||'','vi'):filters.sort==='newest'?b.updatedAt.localeCompare(a.updatedAt):a.updatedAt.localeCompare(b.updatedAt));
  const pending=learnerProgress(scope.reflections).pending;

  // Reading order inside the current list, so the lecturer can move on without returning to it.
  const position=row?visible.findIndex(r=>r.id===row.id):-1;
  const nextPending=row&&visible.find((r,i)=>i>position&&r.status==='submitted'&&r.id!==row.id);
  const backHref=query.student?studentHref(query.student):href('submissions',listQuery);

  const showExport=['submissions','students','progress'].includes(section)&&!row;
  const content=!assigned.courses.length?<section className="lx-empty"><UiIcon name="lecturer" size={24}/><h2>{tr('Chưa có học phần được phân công')}</h2><p>{tr('Liên hệ quản trị viên để được phân công giảng dạy. Danh sách sinh viên và bài nộp sẽ xuất hiện tại đây.')}</p></section>
    :!scope.courses.length?<section className="lx-empty"><h2>{tr('Không có học phần phù hợp bộ lọc lớp.')}</h2><a className="lx-link" href={href(section)}>{tr('Xóa bộ lọc')}</a></section>
    :row?<LecturerReview key={row.id} reflection={row} data={data} language={language} busy={busy} onMutate={mutate}
      backLabel={query.student?'Hồ sơ sinh viên':'Bài nộp'} backHref={backHref} afterHref={nextPending?detailHref(nextPending.id):backHref}
      similarityHref={href('similarity',{course:row.courseId||'',reflection:row.id})}
      studentHref={studentHref(row.userId)}
      pager={position>=0?{index:position,total:visible.length,prev:position>0?detailHref(visible[position-1].id):undefined,next:position<visible.length-1?detailHref(visible[position+1].id):undefined}:undefined}/>
    :section==='overview'?<LecturerOverview language={language} query={query} userName={data.user?.name} userId={data.user?.id} records={data.learningRecords||[]} courses={scope.courses} students={scope.students} memberships={scope.memberships} reflections={scope.reflections} actions={scope.actions} rubric={rubric} detailHref={detailHref} studentHref={studentHref}/>
    :section==='submissions'?<LecturerSubmissions language={language} filters={filters} onFilters={next=>setFilters(f=>({...f,...next}))} rows={visible} all={scope.reflections} courses={scope.courses} rubric={rubric} detailHref={detailHref} studentHref={studentHref}/>
    :section==='students'?<LecturerStudents language={language} studentId={query.student} participation={scope.participation} courses={scope.courses} memberships={scope.memberships} students={scope.students} reflections={scope.reflections} actions={scope.actions} rubric={rubric} detailHref={detailHref} studentHref={studentHref} listHref={href('students',common)}/>
    :section==='progress'?<LecturerAnalytics language={language} courses={scope.courses} students={scope.students} memberships={scope.memberships} reflections={scope.reflections} actions={scope.actions} rubric={rubric} detailHref={detailHref} studentHref={studentHref}/>
    :section==='similarity'?<SimilarityPanel key={`${query.course||'all'}:${query.cohort||''}`} language={language} courses={similarityScope.courses} students={similarityScope.students} memberships={similarityScope.memberships} courseId={query.course||''} courseName={(c=>c?`${c.code} · ${dt(c.name,c.id)}`:'')(scope.courses.find(c=>c.id===query.course))} reflections={similarityScope.reflections} reflectionId={query.reflection} onOpen={id=>{const source=similarityScope.reflections.find(r=>r.id===id);location.assign(href('submissions',{...common,course:source?.courseId||undefined},id))}}/>
    :section==='courses'?<LecturerCourses query={common} courses={scope.courses} memberships={scope.memberships} records={data.learningRecords||[]} selectedCourseId={query.course||''} language={language} busy={busy} onMutate={mutate}/>
    :null;

  return <div className="app-shell lecturer-workspace rail-workspace">
    <WorkspaceHeader sideNavigation mobileSideMenu homeHref={href('overview')} language={language}
      sidebarControls={assigned.courses.length>0?<div className="lx-scope-controls">
        <ClassPicker classes={classes} value={query.cohort||''} language={language} disabled={!!busy} onChange={cohort=>{const keep=assigned.courses.some(c=>c.id===query.course&&(!cohort||(c.className||c.code)===cohort));location.assign(href(section,{cohort,course:keep?query.course:undefined}))}}/>
        <CoursePicker showSelection courses={scope.courses} value={query.course||''} language={language} disabled={!!busy} onChange={value=>location.assign(href(section,{course:value,cohort:query.cohort}))}/>
      </div>:undefined}
      controls={<><button type="button" className="help-button" aria-label={tr('Hướng dẫn sử dụng')} onClick={()=>setHelp(true)}><UiIcon name="help"/></button><LanguageToggle language={language} onChange={setLanguage} disabled={!!busy||(section==='courses'&&hasUnsaved)} title={section==='courses'&&hasUnsaved?tr('Lưu cấu hình trước khi đổi ngôn ngữ.'):undefined}/></>}
      profile={data.user&&<WorkspaceProfile user={data.user} language={language} busy={!!busy} onLogout={()=>void logout()}/>}>
      <LecturerNavigation section={section} query={common} language={language} busy={!!busy} pending={pending}/>
    </WorkspaceHeader>
    <div className="main-shell"><main id="workspace-main" tabIndex={-1} className={`lx${row?' lx-is-review':''}`}>
      {!row&&section!=='overview'&&!(section==='students'&&query.student)&&<header className="lx-page-head">
        <div><h1>{tr(page.label)}</h1><p>{tr(page.description)}</p></div>
        {showExport&&scope.courses.length>0&&<button type="button" className="lx-btn" onClick={exportReport}><UiIcon name="down" size={15}/>{tr('Xuất CSV')}</button>}
      </header>}
      {content}
      {help&&<section ref={helpRef} tabIndex={-1} className="lx-help"><header><h2>{tr('Hướng dẫn sử dụng')}</h2><button type="button" className="lx-icon-btn" aria-label={tr('Đóng')} onClick={()=>setHelp(false)}><UiIcon name="close" size={16}/></button></header><RoleHelp audience="lecturer" language={language}/></section>}
    </main></div>
    {notice&&<div className={`lx-toast${notice.error?' is-error':''}`} role={notice.error?'alert':'status'}><UiIcon name={notice.error?'help':'check'} size={16}/><span>{tr(notice.text)}</span><button type="button" aria-label={tr('Đóng thông báo')} onClick={()=>setNotice(null)}><UiIcon name="close" size={14}/></button></div>}
  </div>;
}
