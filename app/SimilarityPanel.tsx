'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { translate, type Language } from '../lib/i18n';
import { demoText } from '../lib/demo-i18n';
import { writingSections, type Course, type Data, type Reflection, type User } from '../lib/domain';
import type { SimilarityReport, SimilaritySource } from '../lib/similarity';
import UiIcon from './UiIcon';
import { formatDate } from './LecturerKit';

const sectionName=(key:string,language:Language)=>{const section=writingSections.find(s=>s.key===key);return section?language==='en'?section.label:section.name:key};
type Props={language:Language;courseId:string;courseName?:string;courses:Course[];students:User[];memberships:Data['memberships'];reflections:Reflection[];reflectionId?:string;onOpen:(id:string)=>void};

export default function SimilarityPanel({language,courseId,courses,students,memberships,reflections,reflectionId,onOpen}:Props) {
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  const initialTarget=reflections.find(r=>r.id===reflectionId);
  const [selectedCourse,setSelectedCourse]=useState(courseId),[studentId,setStudentId]=useState(initialTarget?.userId||''),[week,setWeek]=useState(''),[targetId,setTargetId]=useState(reflectionId||'');
  const [report,setReport]=useState<SimilarityReport|null>(null),[reportScope,setReportScope]=useState(''),[scanBusy,setBusy]=useState(false),[scanError,setError]=useState('');
  const controller=useRef<AbortController|null>(null),results=useRef<HTMLElement>(null);
  const courseIds=courses.filter(c=>!selectedCourse||c.id===selectedCourse).map(c=>c.id);
  const rosterIds=new Set(memberships.filter(m=>m.role==='student'&&courseIds.includes(m.courseId)).map(m=>m.userId));
  const roster=students.filter(u=>rosterIds.has(u.id)).sort((a,b)=>a.name.localeCompare(b.name,'vi'));
  const documents=reflections.filter(r=>courseIds.includes(r.courseId||'')&&['submitted','final'].includes(r.status)&&(!week||r.week===Number(week)));
  const sources=documents.filter(r=>(!studentId||r.userId===studentId)&&(!targetId||r.id===targetId));
  const peers=documents.filter(r=>!studentId||r.userId!==studentId);
  const ready=courseIds.length>0&&sources.length>0&&(studentId?peers.length>0:new Set(documents.map(r=>r.userId)).size>1);
  const scope=JSON.stringify([courseIds,studentId,week,targetId]);
  const currentReport=reportScope===scope?report:null,busy=reportScope===scope&&scanBusy,error=reportScope===scope?scanError:'';
  const target=reflections.find(r=>r.id===targetId);
  const selected=courses.find(c=>c.id===selectedCourse);
  const scopeLabel=[selected?`${selected.code} · ${demoText(selected.name,selected.id,language)}`:tr('Tất cả học phần trong phạm vi'),studentId?roster.find(u=>u.id===studentId)?.name:tr('Tất cả sinh viên'),week?tr('Tuần {0}',[week]):tr('Tất cả tuần')].filter(Boolean).join(' · ');
  const stale=!!currentReport&&(currentReport.versions.some(doc=>{const row=reflections.find(r=>r.id===doc.id);return !row||row.latestVersion!==doc.versionId||!['submitted','final'].includes(row.status)})||documents.some(r=>r.updatedAt>currentReport.checkedAt));

  useEffect(()=>{controller.current?.abort();return()=>controller.current?.abort()},[scope]);
  useEffect(()=>{if(currentReport){results.current?.focus({preventScroll:true});results.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}},[currentReport]);
  function changeCourse(value:string){
    setSelectedCourse(value);setTargetId('');
    if(studentId&&!memberships.some(m=>m.role==='student'&&m.userId===studentId&&(!value||m.courseId===value)&&courses.some(c=>c.id===m.courseId)))setStudentId('');
  }
  async function scan(event:FormEvent) {
    event.preventDefault();if(!ready||busy)return;
    controller.current?.abort();const abort=new AbortController();controller.current=abort;
    setBusy(true);setError('');setReport(null);setReportScope(scope);
    try{
      const response=await fetch('/api/similarity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({courseId:selectedCourse||null,courseIds,studentId:studentId||null,week:week?Number(week):null,reflectionId:targetId||null}),signal:abort.signal});
      const data=await response.json() as SimilarityReport&{error?:string};
      if(!response.ok)throw new Error(data.error||'Không thể kiểm tra trùng lặp.');
      if(controller.current===abort&&!abort.signal.aborted)setReport(data);
    }catch(caught){if(controller.current===abort&&!abort.signal.aborted)setError(caught instanceof Error?caught.message:'Không thể kiểm tra trùng lặp.')}
    finally{if(controller.current===abort)setBusy(false)}
  }
  const count=studentId?tr('{0} bài nguồn · {1} bài đối chiếu',[sources.length,peers.length]):tr('{0} bài · {1} sinh viên',[documents.length,new Set(documents.map(r=>r.userId)).size]);
  return <div className="lx-stack lx-similarity">
    <form className="lx-scan" id="similarity-settings" onSubmit={scan}>
      <fieldset className="lx-scan-fields" disabled={busy}><legend className="sr-only">{tr('Bộ lọc kiểm tra trùng lặp')}</legend>
        <label><span>{tr('Học phần')}</span><select value={selectedCourse} onChange={e=>changeCourse(e.target.value)}><option value="">{tr('Tất cả học phần trong phạm vi')}</option>{courses.map(c=><option key={c.id} value={c.id}>{c.code} · {demoText(c.name,c.id,language)}{c.className&&c.className!==c.code?` · ${c.className}`:''}</option>)}</select></label>
        <label><span>{tr('Sinh viên')}</span><select value={studentId} onChange={e=>{setStudentId(e.target.value);setTargetId('')}}><option value="">{tr('Tất cả sinh viên')}</option>{roster.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
        <label><span>{tr('Tuần')}</span><select value={week} onChange={e=>{setWeek(e.target.value);setTargetId('')}}><option value="">{tr('Tất cả tuần')}</option>{Array.from({length:9},(_,i)=><option key={i} value={i+1}>{tr('Tuần {0}',[i+1])}</option>)}</select></label>
        <button className="lx-btn is-primary" type="submit" aria-busy={busy} disabled={busy||!ready}>{busy&&<UiIcon name="spinner" size={15}/>}{tr(busy?'Đang đối chiếu…':currentReport?'Kiểm tra lại':'Đối chiếu')}</button>
      </fieldset>
      <p className="lx-scan-meta">{ready?<>{count} · {tr('chỉ bài đã nộp hoặc hoàn tất')}</>:tr('Cần bài từ ít nhất hai sinh viên khác nhau. Hãy đổi bộ lọc để mở rộng phạm vi.')}</p>
      {target&&<p className="lx-scan-target">{tr('Bài được chọn')}: <b>{demoText(target.title,target.id,language)||tr('Reflection chưa đặt tên')}</b><button className="lx-icon-btn" type="button" disabled={busy} aria-label={tr('Bỏ chọn bài')} onClick={()=>setTargetId('')}><UiIcon name="close" size={13}/></button></p>}
    </form>
    {error&&<p className="lx-notice is-error" role="alert">{tr(error)}</p>}
    {busy?<p className="lx-scan-wait" role="status">{tr('Đang tìm các đoạn tương đồng…')}</p>
      :currentReport?<section className="lx-sim-results" ref={results} tabIndex={-1} aria-label={tr('Kết quả đối chiếu')}>
        {stale&&<p className="lx-notice is-warn" role="alert">{tr('Một bài đã đổi phiên bản sau khi kiểm tra. Hãy kiểm tra lại trước khi sử dụng kết quả.')}</p>}
        <SimilarityResults report={currentReport} language={language} scopeLabel={scopeLabel} stale={stale} onOpen={onOpen}/>
      </section>
      :<p className="lx-scan-wait">{tr('Chọn phạm vi rồi bấm Đối chiếu. Các cặp bài tương đồng sẽ hiện tại đây.')}</p>}
    <details className="lx-disclosure"><summary>{tr('Cách đối chiếu và giới hạn')}</summary><p>{tr('Đối chiếu cụm 5 từ liên tiếp, bỏ qua khác biệt hoa/thường và dấu câu, cùng các câu hướng dẫn tuần. Hiển thị khi có ít nhất 8 cụm chung và ít nhất 10% từ của một bài trùng. Không so sánh các bài của cùng một sinh viên.')}</p><p>{tr('Chỉ kiểm tra bài đã nộp hoặc hoàn thành. Chưa đối chiếu Internet, trường khác, nội dung ảnh hay văn bản được diễn đạt lại. Không dùng kết quả để tự động trừ điểm.')}</p></details>
  </div>;
}

export function SimilarityResults({report,language,scopeLabel,stale=false,onOpen}:{report:SimilarityReport;language:Language;scopeLabel:string;stale?:boolean;onOpen:(id:string)=>void}){
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  const title=(doc:SimilaritySource)=>demoText(doc.title,doc.id,language)||tr('Reflection chưa đặt tên');
  return <>
    <header className="lx-sim-summary" title={scopeLabel}>
      <h2>{report.matchedPairs?tr('{0} cặp bài cần xem xét',[report.matchedPairs]):tr(report.comparedPairs?'Chưa thấy đoạn trùng đáng chú ý':'Chưa đủ bài để đối chiếu')}</h2>
      <p>{tr('{0} bài · {1} cặp đã đối chiếu',[report.documents,report.comparedPairs])}{report.skipped>0&&<> · {tr('{0} bài quá ngắn bị bỏ qua',[report.skipped])}</>} · {formatDate(report.checkedAt,language,true)}</p>
    </header>
    {report.matches.length>0&&<p className="lx-footnote">{tr('Tỷ lệ trùng là tín hiệu để xem xét, không phải kết luận đạo văn.')}</p>}
    {report.matchedPairs>report.matches.length&&<p className="lx-notice">{tr('Hiển thị 200 cặp có tỷ lệ trùng cao nhất. Chọn học phần cụ thể để thu hẹp kết quả.')}</p>}
    {report.matches.length>0&&<ol className="lx-sim-list">{report.matches.map((match,index)=>{
      const flip=report.reflectionId?match.right.id===report.reflectionId:!!report.studentId&&match.right.userId===report.studentId;
      const docs=flip?[match.right,match.left]:[match.left,match.right],rates=flip?[match.coverageRight,match.coverageLeft]:[match.coverageLeft,match.coverageRight];
      const top=Math.max(...rates);
      return <li key={`${match.left.id}:${match.right.id}`}><details open={index===0}>
        <summary>
          <span className="lx-sim-no">{index+1}</span>
          {docs.map(doc=><span className="lx-sim-doc" key={doc.id}><b>{doc.studentName}</b><small>{title(doc)}</small></span>)}
          <span className="lx-sim-rate" title={tr('{0}% và {1}% số từ của mỗi bài',rates)}><b>{top}%</b><i><s style={{width:`${top}%`}}/></i></span>
          <UiIcon name="chevron" size={16}/>
        </summary>
        <div className="lx-sim-body">
          {docs.map((doc,i)=><div className="lx-sim-col-head" key={doc.id}><span><b>{doc.studentName}</b> · {tr('{0}% từ trùng',[rates[i]])}</span><button type="button" className="lx-link" disabled={stale} onClick={()=>onOpen(doc.id)}>{tr('Mở bài')}<UiIcon name="arrow" size={13}/></button></div>)}
          {match.excerpts.flatMap((excerpt,i)=>(flip?[excerpt.right,excerpt.left]:[excerpt.left,excerpt.right]).map((part,j)=><blockquote key={`${i}-${j}`}><small><span className="lx-sim-who">{docs[j].studentName} · </span>{sectionName(part.section,language)}</small><p>{part.text}</p></blockquote>))}
        </div>
      </details></li>;
    })}</ol>}
    {!report.matches.length&&<p className="lx-scan-wait">{tr(report.comparedPairs?'Không có cặp đạt ngưỡng hiển thị. Kết quả không xác nhận bài hoàn toàn nguyên gốc.':'Cần ít nhất hai bài từ hai sinh viên khác nhau, mỗi bài ít nhất 40 từ.')}</p>}
  </>;
}
