'use client';
import { useEffect, useRef, useState } from 'react';
import { homePath, type Role } from '../lib/access';
import { statuses, type Data } from '../lib/domain';
import { demoText } from '../lib/demo-i18n';
import { dateLocale, languageCookie, translate, type Language } from '../lib/i18n';
import { lecturerHref, lecturerPages, lecturerScope, safeCsv, weeklyClassProgress, type LecturerQuery, type LecturerSection } from '../lib/lecturer-pages';
import { currentFeedback, finalReview, learnerProgress } from '../lib/progress';
import UiIcon from './UiIcon';
import WorkspacePageHeading from './WorkspacePageHeading';
import UserAvatar from './UserAvatar';
import WorkspaceProfile from './WorkspaceProfile';
import WorkspaceHeader from './WorkspaceHeader';
import LanguageToggle from './LanguageToggle';
import { useAIProvider } from './AIProviderSelect';
import LecturerNavigation from './LecturerNavigation';
import LecturerClassFilter from './LecturerClassFilter';
import CoursePicker from './CoursePicker';
import LecturerInsights from './LecturerInsights';
import LecturerReview from './LecturerReview';
import LecturerCourses from './LecturerCourses';
import SimilarityPanel from './SimilarityPanel';
import RoleHelp from './RoleHelp';
import SiteFooter from './SiteFooter';
import CourseHistory from './CourseHistory';
import LearningAnalytics from './LearningAnalytics';
import ActionMonitoring from './ActionMonitoring';
import ParticipationPanel from './ParticipationPanel';
import WorkspaceSections from './WorkspaceSections';
import {criterionLevel} from '../lib/assessment';
import {reportHeaders,reportRows} from '../lib/learning-analytics';

export type LecturerMutation = (body: Record<string, unknown>, message: string) => Promise<boolean>;

export default function LecturerWorkspace({initialData,initialLanguage,section,query,reflectionId}: {
  initialData: Data; initialLanguage: Language; section: LecturerSection; query: LecturerQuery; reflectionId?: string;
}) {
  const [data,setData]=useState(initialData), [language,setLanguage]=useState(initialLanguage);
  const {provider:aiProvider}=useAIProvider(data);
  const [busy,setBusy]=useState(''), [notice,setNotice]=useState<{text:string;error:boolean}|null>(null), [help,setHelp]=useState(false);
  const [hasUnsaved,setHasUnsaved]=useState(false);
  const helpRef=useRef<HTMLElement>(null);
  const [search,setSearch]=useState(query.q||'');
  const [criterion,setCriterion]=useState(query.criterion||''),[scoreLevel,setScoreLevel]=useState(query.level||''),[sort,setSort]=useState(query.sort||'oldest');
  const [status,setStatus]=useState(['all','submitted','returned','final'].includes(query.status||'')?query.status!:'submitted');
  const [week,setWeek]=useState(/^[1-9]$/.test(query.week||'')?query.week!:'');
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  const dt=(text:string,id?:string|null)=>demoText(text,id,language);
  const scope=lecturerScope(data,query.course,query.cohort), course=scope.courses.find(c=>c.id===query.course);
  const classes=[...new Set(lecturerScope(data).courses.map(c=>c.className||c.code))];
  const rubric=course?.rubric||data.rubric;
  const row=scope.reflections.find(r=>r.id===reflectionId);
  const student=scope.students.find(u=>u.id===query.student);
  const page=lecturerPages.find(p=>p.key===section)!;
  const common={course:query.course,cohort:query.cohort};
  const detailHref=(id:string)=>lecturerHref('submissions',{...common,status,week,q:search,student:query.student,criterion,level:scoreLevel,sort},id);
  const studentHref=(id:string)=>lecturerHref('students',{...common,student:id});
  const dates=(value:string)=>new Date(value).toLocaleDateString(dateLocale(language),{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric'});

  useEffect(()=>{
    if(section!=='submissions'||reflectionId)return;
    history.replaceState({},'',lecturerHref('submissions',{course:query.course,cohort:query.cohort,status,week,q:search,criterion,level:scoreLevel,sort}));
  },[section,reflectionId,query.course,query.cohort,status,week,search,criterion,scoreLevel,sort]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(null),7000);return()=>clearTimeout(timer)},[notice]);
  useEffect(()=>{const change=(event:Event)=>setHasUnsaved(!!(event as CustomEvent<boolean>).detail);window.addEventListener('thinkup:unsaved',change);return()=>window.removeEventListener('thinkup:unsaved',change)},[]);
  useEffect(()=>{if(!help)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setHelp(false)};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[help]);
  useEffect(()=>{if(help){helpRef.current?.scrollIntoView({behavior:'smooth',block:'start'});helpRef.current?.focus({preventScroll:true})}},[help]);
  useEffect(()=>{
    document.documentElement.lang=language;
    document.title=translate(page.label,language)+' · THINK UP';
    document.cookie=languageCookie+'='+language+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');
  },[language,page.label]);

  function changeLanguage(next:Language) {
    setLanguage(next);
  }
  const mutate:LecturerMutation=async(body,message)=>{
    setBusy(String(body.action));
    try {
      const response=await fetch('/api/thinkup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,language,aiProvider})});
      const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error||'Thao tác chưa hoàn tất.');
      // The mutation is committed even if the subsequent refresh loses its connection.
      try{
        const refreshed=await fetch('/api/thinkup',{cache:'no-store'}),fresh=await refreshed.json() as Data;
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
    const url=URL.createObjectURL(new Blob(['\uFEFF'+content],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='think-up-lecturer.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const visible=scope.reflections.filter(r=>{
    const review=finalReview(r),proposal=currentFeedback(r),index=rubric.findIndex(c=>c.key===criterion);
    const actual=index<0?null:review?.criteria?.[index]?.level||(review?(review.scoreScale===10?criterionLevel(review.scores[index]):review.scores[index]):proposal?.result.criteria[index]?.level);
    return (status==='all'||r.status===status)&&(!query.student||r.userId===query.student)&&(!week||r.week===Number(week))&&`${dt(r.title,r.id)} ${r.studentName} ${r.studentEmail}`.toLowerCase().includes(search.trim().toLowerCase())&&(!criterion||!scoreLevel||actual===Number(scoreLevel));
  }).sort((a,b)=>sort==='name'?(a.studentName||'').localeCompare(b.studentName||''):sort==='newest'?b.updatedAt.localeCompare(a.updatedAt):a.updatedAt.localeCompare(b.updatedAt));
  const progress=learnerProgress(scope.reflections);
  const visibleStudents=scope.students.filter(u=>`${u.name} ${u.email}`.toLowerCase().includes(search.trim().toLowerCase()));

  return <div className="app-shell lecturer-workspace rail-workspace">
    <WorkspaceHeader sideNavigation mobileSideMenu homeHref={lecturerHref('submissions')} language={language} sidebarControls={classes.length>0?<CoursePicker courses={scope.courses} value={query.course||''} language={language} disabled={!!busy} onChange={value=>location.assign(lecturerHref(section,{course:value,cohort:query.cohort}))}/>:undefined} controls={<><button type="button" className="help-button" aria-label={tr('Hướng dẫn sử dụng')} onClick={()=>setHelp(true)}><UiIcon name="help"/></button><LanguageToggle language={language} onChange={changeLanguage} disabled={!!busy||(section==='courses'&&hasUnsaved)} title={section==='courses'&&hasUnsaved?tr('Lưu cấu hình trước khi đổi ngôn ngữ.'):undefined}/></>} profile={data.user&&<WorkspaceProfile user={data.user} language={language} busy={!!busy} onLogout={()=>void logout()}/>}>
<LecturerNavigation section={section} query={common} language={language} busy={!!busy} pending={progress.pending}/>
</WorkspaceHeader>
    <div className="main-shell"><main id="workspace-main" tabIndex={-1}>
      {row?<LecturerReview key={row.id} reflection={row} data={data} language={language} busy={busy} onMutate={mutate} backLabel={query.student?'Hồ sơ sinh viên':'Danh sách bài nộp'} backHref={query.student?studentHref(query.student):lecturerHref('submissions',{...common,status,week,q:search})} similarityHref={lecturerHref('similarity',{course:row.courseId||'',reflection:row.id})}/>:<>
        <WorkspacePageHeading title={tr(page.label)}>{['submissions','students','progress'].includes(section)&&<button className="button" onClick={exportReport}>{tr('Xuất CSV')}</button>}</WorkspacePageHeading>
        <LecturerClassFilter classes={classes} value={query.cohort||''} section={section} language={language} busy={!!busy}/>
        {!scope.courses.length?<section className="panel empty"><UiIcon name="lecturer" size={28}/><h3>{tr('Chưa có học phần được phân công')}</h3><p>{tr('Liên hệ quản trị viên để được phân công giảng dạy. Danh sách sinh viên và bài nộp sẽ xuất hiện tại đây.')}</p></section>:<>
          {section==='submissions'&&<>
            <div className="submission-statuses" aria-label={tr('Lọc bài nộp')}>{[['submitted','Chờ đánh giá'],['returned','Đang chỉnh sửa'],['final','Đã hoàn thành'],['all','Tất cả']].map(([key,label])=><button key={key} className={status===key?'selected':''} aria-pressed={status===key} onClick={()=>setStatus(key)}>{tr(label)}<span>{scope.reflections.filter(r=>key==='all'||r.status===key).length}</span></button>)}</div>
            <div className="toolbar filter-grid lecturer-filters"><select aria-label={tr('Lọc theo tiêu chí')} value={criterion} onChange={e=>setCriterion(e.target.value)}><option value="">{tr('Tất cả tiêu chí')}</option>{rubric.map(c=><option key={c.key} value={c.key}>{tr(c.name)}</option>)}</select><select aria-label="Level" value={scoreLevel} disabled={!criterion} onChange={e=>setScoreLevel(e.target.value)}><option value="">{tr('Tất cả Level')}</option>{[1,2,3,4].map(n=><option key={n} value={n}>Level {n}</option>)}</select><select aria-label={tr('Sắp xếp')} value={sort} onChange={e=>setSort(e.target.value)}>{[['oldest','Cũ nhất trước'],['newest','Mới nhất trước'],['name','Tên sinh viên']].map(([value,label])=><option key={value} value={value}>{tr(label)}</option>)}</select><input aria-label={tr('Tìm bài hoặc sinh viên')} maxLength={200} value={search} onChange={e=>setSearch(e.target.value)} placeholder={tr('Tìm theo bài viết, tên hoặc email…')}/><select aria-label={tr('Lọc theo tuần')} value={week} onChange={e=>setWeek(e.target.value)}><option value="">{tr('Tất cả tuần')}</option>{Array.from({length:9},(_,i)=><option key={i} value={i+1}>{tr('Tuần {0}',[i+1])}</option>)}</select></div>
            <section className="panel"><div className="section-head"><h3>{tr(status==='submitted'?'Bài cần đánh giá':'Danh sách bài nộp')}</h3><small className="muted">{tr('{0} bài',[visible.length])}</small></div>
              {visible.length?<div className="table-scroll"><table><thead><tr><th>{tr('Sinh viên')}</th><th>{tr('Bài reflection')}</th><th>{tr('Tuần')}</th><th>{tr('Trạng thái')}</th><th>{tr('Cập nhật')}</th><th>{tr('Điểm cuối')}</th><th>{tr('Thao tác')}</th></tr></thead><tbody>{visible.map(r=><tr key={r.id}><td><b>{r.studentName}</b><small>{r.studentEmail}</small></td><td><a className="table-title" href={detailHref(r.id)}>{dt(r.title,r.id)}</a><small>{dt(r.courseName||'',r.courseId)}</small></td><td>{r.week}</td><td><span className={`badge ${r.status}`}>{tr(statuses[r.status])}</span></td><td>{dates(r.updatedAt)}</td><td>{finalReview(r)?.total??'—'}</td><td><a className="text-button" href={detailHref(r.id)}>{tr(r.status==='submitted'?'Đánh giá':'Xem bài')}<UiIcon name="next" size={15}/></a></td></tr>)}</tbody></table></div>:<div className="empty"><UiIcon name="check" size={28}/><h4>{tr(status==='submitted'?'Không có bài chờ đánh giá':'Không có bài phù hợp bộ lọc')}</h4><p>{tr('Chọn trạng thái khác hoặc điều chỉnh bộ lọc để xem các bài đã nộp.')}</p><button className="button" onClick={()=>{setStatus('all');setWeek('');setSearch('')}}>{tr('Xem tất cả bài nộp')}</button></div>}
            </section>
          </>}
          {section==='students'&&(student?<><a className="text-button section-margin" href={lecturerHref('students',common)}>← {tr('Danh sách sinh viên')}</a><LecturerInsights language={language} students={scope.students} reflections={scope.reflections} rubric={rubric} studentId={student.id} onStudent={id=>location.assign(id?studentHref(id):lecturerHref('students',common))} onOpen={id=>location.assign(detailHref(id))} courseCount={new Set(scope.memberships.filter(m=>m.userId===student.id).map(m=>m.courseId)).size} standalone/><LearningAnalytics reflections={scope.reflections.filter(r=>r.userId===student.id)} actions={scope.actions.filter(a=>a.userId===student.id)} rubric={rubric} language={language} onOpen={id=>location.assign(detailHref(id))}/><ActionMonitoring actions={scope.actions.filter(a=>a.userId===student.id)} reflections={scope.reflections} users={scope.students} language={language}/></>:<>
            <div className="toolbar"><input aria-label={tr('Tìm sinh viên')} placeholder={tr('Tìm theo tên hoặc email…')} maxLength={200} value={search} onChange={e=>setSearch(e.target.value)}/></div>
            <section className="panel"><div className="section-head"><h3>{tr('Danh sách sinh viên')}</h3><small className="muted">{visibleStudents.length} {tr('sinh viên')}</small></div><div className="table-scroll"><table><thead><tr><th>{tr('Sinh viên')}</th><th>{tr('Học phần')}</th><th>{tr('Bài đã nộp')}</th><th>{tr('Chờ đánh giá')}</th><th>{tr('Điểm cuối trung bình')}</th><th>{tr('Thao tác')}</th></tr></thead><tbody>{visibleStudents.map(u=>{const own=learnerProgress(scope.reflections.filter(r=>r.userId===u.id));return <tr key={u.id}><td><div className="user-cell"><UserAvatar person={u}/><div><b>{u.name}</b><small>{u.email}</small>{!u.active&&<span className="badge returned">{tr('Tạm ngừng')}</span>}</div></div></td><td>{scope.memberships.filter(m=>m.userId===u.id).map(m=><small key={m.courseId}>{scope.courses.find(c=>c.id===m.courseId)?.code}</small>)}</td><td>{own.submitted}</td><td>{own.pending}</td><td>{own.average?.toFixed(2)??'—'}</td><td><a className="text-button" href={studentHref(u.id)}>{tr('Xem hồ sơ')}<UiIcon name="next" size={15}/></a></td></tr>})}</tbody></table></div>{!visibleStudents.length&&<div className="empty"><p>{tr(scope.students.length?'Không có sinh viên phù hợp bộ lọc':'Chưa có sinh viên được phân công')}</p></div>}</section>
          </>)}
          {section==='progress'&&<>
            <div className="stat-grid"><div className="stat"><span>{tr('Sinh viên')}</span><b>{scope.students.length}</b></div><div className="stat"><span>{tr('Bài chờ đánh giá')}</span><b>{progress.pending}</b></div><div className="stat"><span>{tr('Bài đã xác nhận')}</span><b>{progress.final}</b></div><div className="stat"><span>{tr('Điểm cuối trung bình')}</span><b>{progress.average?.toFixed(2)??'—'}<small>/10</small></b></div></div>
            <WorkspaceSections label={tr('Tiến độ học tập')} items={[
              {id:'overview',label:tr('Tổng quan'),content:<><ParticipationPanel memberships={scope.memberships} users={scope.students} courses={scope.courses} participation={scope.participation} language={language}/>            <section className="panel section-margin"><h3>{tr('Tiến độ theo tuần')}</h3><p className="muted">{tr('Mỗi sinh viên tính một lần cho mỗi tuần trong từng học phần. Điểm trung bình chỉ lấy đánh giá cuối.')}</p><div className="table-scroll"><table><thead><tr><th>{tr('Tuần')}</th><th>{tr('Đã có bài / Phân công')}</th><th>{tr('Đã hoàn thành')}</th><th>{tr('Chờ đánh giá')}</th><th>{tr('Điểm cuối trung bình')}</th></tr></thead><tbody>{weeklyClassProgress(scope.reflections,scope.memberships).map(w=><tr key={w.week}><td>{tr('Tuần {0}',[w.week])}</td><td>{w.submitted}/{w.expected}</td><td>{w.completed}</td><td>{w.pending}</td><td>{w.average?.toFixed(2)??'—'}</td></tr>)}</tbody></table></div></section>
            <LecturerInsights language={language} students={scope.students} reflections={scope.reflections} rubric={rubric} studentId="" onStudent={id=>location.assign(studentHref(id))} onOpen={id=>location.assign(detailHref(id))} courseCount={scope.courses.length} standalone/>
</>},
              {id:'criteria',label:tr('Báo cáo theo tiêu chí'),content:<LearningAnalytics reflections={scope.reflections} actions={scope.actions} rubric={rubric} language={language} onOpen={id=>location.assign(detailHref(id))}/>},
              {id:'actions',label:tr('Theo dõi kế hoạch hành động'),content:<ActionMonitoring actions={scope.actions} reflections={scope.reflections} users={scope.students} language={language}/>},
            ]}/>
          </>}
          {section==='similarity'&&<SimilarityPanel key={query.course||'all'} language={language} courseId={query.course||''} courseName={course?dt(course.name,course.id):''} reflections={scope.reflections} reflectionId={query.reflection} onOpen={id=>location.assign(detailHref(id))}/>}
          {section==='courses'&&<><LecturerCourses courses={scope.courses} memberships={scope.memberships} selectedCourseId={query.course||''} language={language} busy={busy} onMutate={mutate}/><CourseHistory records={data.learningRecords||[]} courseId={query.course} language={language}/></>}
        </>}
      </>}
      {help&&<section ref={helpRef} tabIndex={-1} className="panel section-margin lecturer-help"><div className="section-head"><h3>{tr('Hướng dẫn sử dụng')}</h3><button className="help-button" aria-label={tr('Đóng')} onClick={()=>setHelp(false)}><UiIcon name="close"/></button></div><RoleHelp audience="lecturer" language={language}/></section>}
      <SiteFooter language={language} compact onHelp={()=>setHelp(true)}/>
    </main></div>
    {notice&&<div className={`toast ${notice.error?'error':''}`} role={notice.error?'alert':'status'}><UiIcon name={notice.error?'help':'check'}/><span>{tr(notice.text)}</span><button aria-label={tr('Đóng thông báo')} onClick={()=>setNotice(null)}><UiIcon name="close" size={14}/></button></div>}
  </div>;
}
