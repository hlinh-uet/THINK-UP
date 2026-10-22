'use client';
import {useState} from 'react';
import type {Data} from '../lib/domain';
import {translate,type Language} from '../lib/i18n';
import {adminHref,type AdminSection} from '../lib/admin-pages';
import {currentFeedback,finalReview} from '../lib/progress';
import {criterionLevel} from '../lib/assessment';
import {reportHeaders,reportRows} from '../lib/learning-analytics';
import {safeCsv} from '../lib/lecturer-pages';
import LecturerReview from './LecturerReview';
import LearningAnalytics from './LearningAnalytics';
import ActionMonitoring from './ActionMonitoring';
import ParticipationPanel from './ParticipationPanel';
import WorkspaceSections from './WorkspaceSections';
import TablePagination,{usePageRows} from './TablePagination';
import {learnerProgress} from '../lib/progress';
import SimilarityPanel from './SimilarityPanel';
import WorkspacePageHeading from './WorkspacePageHeading';
import type {LecturerMutation} from './LecturerWorkspace';
export default function AdminMonitoring({data,language,section='submissions',courseId,reflectionId,busy,onMutate}:{data:Data;language:Language;section?:AdminSection;courseId:string;reflectionId?:string;busy:string;onMutate:LecturerMutation}){
 const tr=(s:string)=>translate(s,language),[search,setSearch]=useState(''),[status,setStatus]=useState('all'),[week,setWeek]=useState(''),[criterion,setCriterion]=useState(''),[level,setLevel]=useState(''),[sort,setSort]=useState('oldest'),[cohort,setCohort]=useState('');
 const rows=data.classReflections.filter(r=>(!courseId||r.courseId===courseId)&&(!cohort||(data.courses.find(c=>c.id===r.courseId)?.className||data.courses.find(c=>c.id===r.courseId)?.code)===cohort)),rubric=data.courses.find(c=>c.id===courseId)?.rubric||data.rubric,row=rows.find(r=>r.id===reflectionId),open=(id:string)=>location.assign(adminHref('submissions',{course:courseId,reflection:id}));
 const actions=(data.classActions||[]).filter(a=>rows.some(r=>r.id===a.reflectionId));
 const scopedCourses=data.courses.filter(c=>(!courseId||c.id===courseId)&&(!cohort||(c.className||c.code)===cohort));
 const courseIds=new Set(scopedCourses.map(c=>c.id)),memberships=data.memberships.filter(m=>courseIds.has(m.courseId)),progress=learnerProgress(rows);
 const students=new Set(memberships.filter(m=>m.role==='student').map(m=>m.userId));
 function download(){const csv=safeCsv([reportHeaders.map(tr),...reportRows(rows,rubric)]),url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='think-up-assessments.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const visible=rows.filter(r=>{const g=finalReview(r),a=currentFeedback(r),i=rubric.findIndex(c=>c.key===criterion),actual=i<0?null:g?.criteria?.[i]?.level||(g?(g.scoreScale===10?criterionLevel(g.scores[i]):g.scores[i]):a?.result.criteria[i]?.level);return (status==='all'||r.status===status)&&(!week||r.week===Number(week))&&`${r.title} ${r.studentName} ${r.studentEmail}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())&&(!criterion||!level||actual===Number(level))}).sort((a,b)=>sort==='name'?(a.studentName||'').localeCompare(b.studentName||''):sort==='newest'?b.updatedAt.localeCompare(a.updatedAt):a.updatedAt.localeCompare(b.updatedAt));
 const pagination=usePageRows(visible,JSON.stringify([courseId,cohort,search,status,week,criterion,level,sort]));
 if(row)return <LecturerReview key={row.id} reflection={row} data={data} language={language} busy={busy} onMutate={onMutate} backHref={adminHref('submissions',{course:courseId})} backLabel="Bài nộp toàn hệ thống" similarityHref={adminHref('similarity',{course:row.courseId||''})}/>;
 if(section==='similarity')return <><WorkspacePageHeading title={tr('Kiểm tra trùng lặp')}/><SimilarityPanel language={language} courseId={courseId} courseName={data.courses.find(c=>c.id===courseId)?.name||''} reflections={rows} onOpen={open}/></>;
 return <><WorkspacePageHeading title={tr(section==='progress'?'Tiến độ học tập':'Bài nộp toàn hệ thống')}><button className="button" onClick={download}>{tr('Xuất CSV')}</button></WorkspacePageHeading>
  <label className="field scope-filter">{tr('Lọc theo lớp')}<select value={cohort} onChange={e=>setCohort(e.target.value)}><option value="">{tr('Tất cả lớp')}</option>{[...new Set(data.courses.map(c=>c.className||c.code))].map(name=><option key={name} value={name}>{name}</option>)}</select></label>{section==='submissions'&&<><div className="toolbar filter-grid"><input aria-label={tr('Tìm bài hoặc sinh viên')} value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label={tr('Trạng thái')} value={status} onChange={e=>setStatus(e.target.value)}>{[['all','Tất cả'],['submitted','Chờ đánh giá'],['returned','Đang chỉnh sửa'],['final','Đã hoàn thành']].map(([key,label])=><option key={key} value={key}>{tr(label)}</option>)}</select><select aria-label={tr('Tuần')} value={week} onChange={e=>setWeek(e.target.value)}><option value="">{tr('Tất cả tuần')}</option>{Array.from({length:9},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select><select aria-label={tr('Tiêu chí')} value={criterion} onChange={e=>setCriterion(e.target.value)}><option value="">{tr('Tất cả tiêu chí')}</option>{rubric.map(c=><option key={c.key} value={c.key}>{tr(c.name)}</option>)}</select><select aria-label="Level" value={level} disabled={!criterion} onChange={e=>setLevel(e.target.value)}><option value="">{tr('Tất cả Level')}</option>{[1,2,3,4].map(n=><option key={n} value={n}>Level {n}</option>)}</select><select aria-label={tr('Sắp xếp')} value={sort} onChange={e=>setSort(e.target.value)}>{[['oldest','Cũ nhất trước'],['newest','Mới nhất trước'],['name','Tên sinh viên']].map(([key,label])=><option key={key} value={key}>{tr(label)}</option>)}</select></div>
  <section className="panel table-scroll"><table><thead><tr><th>{tr('Sinh viên')}</th><th>{tr('Bài reflection')}</th><th>{tr('Tuần')}</th><th>{tr('Trạng thái')}</th><th>{tr('Điểm cuối')}</th></tr></thead><tbody>{pagination.rows.map(r=><tr key={r.id}><td>{r.studentName}</td><td><button className="text-button" onClick={()=>open(r.id)}>{r.title}</button></td><td>{r.week}</td><td>{tr(({submitted:'Chờ đánh giá',returned:'Đang chỉnh sửa',final:'Đã hoàn thành'} as Record<string,string>)[r.status]||r.status)}</td><td>{finalReview(r)?.total??'—'}</td></tr>)}</tbody></table><TablePagination {...pagination} total={visible.length} language={language}/></section></>}
  {section==='progress'&&<>
   <div className="stat-grid"><div className="stat"><span>{tr('Sinh viên')}</span><b>{students.size}</b></div><div className="stat"><span>{tr('Bài chờ đánh giá')}</span><b>{progress.pending}</b></div><div className="stat"><span>{tr('Bài đã xác nhận')}</span><b>{progress.final}</b></div><div className="stat"><span>{tr('Điểm cuối trung bình')}</span><b>{progress.average?.toFixed(2)??'—'}<small>/10</small></b></div></div>
   <WorkspaceSections label={tr('Tiến độ học tập')} items={[
    {id:'overview',label:tr('Tổng quan'),content:<ParticipationPanel memberships={memberships} users={data.users} courses={scopedCourses} participation={(data.participation||[]).filter(p=>courseIds.has(p.courseId))} language={language}/>},
    {id:'criteria',label:tr('Báo cáo theo tiêu chí'),content:<LearningAnalytics reflections={rows} actions={actions} rubric={rubric} language={language} onOpen={open}/>},
    {id:'actions',label:tr('Theo dõi kế hoạch hành động'),content:<ActionMonitoring actions={actions} reflections={rows} users={data.users} language={language}/>},
   ]}/>
  </>}
 </>;
}
