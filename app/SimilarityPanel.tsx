'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { translate, type Language } from '../lib/i18n';
import { demoText } from '../lib/demo-i18n';
import type { Course, Data, Reflection, User } from '../lib/domain';
import type { SimilarityReport, SimilaritySource } from '../lib/similarity';
import UiIcon from './UiIcon';
import ScopePicker from './ScopePicker';
import { formatDate } from './LecturerKit';

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
  return <div className="lx-stack lx-similarity">
    <form className="lx-scan" id="similarity-settings" onSubmit={scan}>
      <fieldset className="lx-scan-fields" disabled={busy}><legend className="sr-only">{tr('Bộ lọc kiểm tra trùng lặp')}</legend>
        <ScopePicker label={tr('Học phần')} ariaLabel={tr('Học phần')} icon="journey" value={selectedCourse} disabled={busy} onChange={changeCourse}
          options={[{value:'',label:tr('Tất cả học phần trong phạm vi')},...courses.map(c=>({value:c.id,label:demoText(c.name,c.id,language),code:[c.code,c.className&&c.className!==c.code?c.className:''].filter(Boolean).join(' · ')}))]}/>
        <ScopePicker label={tr('Sinh viên')} ariaLabel={tr('Sinh viên')} icon="users" value={studentId} disabled={busy} onChange={value=>{setStudentId(value);setTargetId('')}}
          options={[{value:'',label:tr('Tất cả sinh viên')},...roster.map(u=>({value:u.id,label:u.name}))]}/>
        <ScopePicker label={tr('Tuần')} ariaLabel={tr('Tuần')} icon="progress" value={week} disabled={busy} onChange={value=>{setWeek(value);setTargetId('')}}
          options={[{value:'',label:tr('Tất cả tuần')},...Array.from({length:9},(_,i)=>({value:String(i+1),label:tr('Tuần {0}',[i+1])}))]}/>
        <button className="lx-btn is-primary" type="submit" aria-busy={busy} disabled={busy||!ready}>{busy&&<UiIcon name="spinner" size={15}/>}{tr(busy?'Đang đối chiếu…':currentReport?'Kiểm tra lại':'Đối chiếu')}</button>
      </fieldset>
      {!ready&&<p className="lx-scan-meta">{tr('Cần bài từ ít nhất hai sinh viên khác nhau. Hãy đổi bộ lọc để mở rộng phạm vi.')}</p>}
      {target&&<p className="lx-scan-target">{tr('Bài được chọn')}: <b>{demoText(target.title,target.id,language)||tr('Reflection chưa đặt tên')}</b><button className="lx-icon-btn" type="button" disabled={busy} aria-label={tr('Bỏ chọn bài')} onClick={()=>setTargetId('')}><UiIcon name="close" size={13}/></button></p>}
    </form>
    {error&&<p className="lx-notice is-error" role="alert">{tr(error)}</p>}
    {busy?<p className="lx-scan-wait" role="status">{tr('Đang tìm các đoạn tương đồng…')}</p>
      :currentReport?<section className="lx-sim-results" ref={results} tabIndex={-1} aria-label={tr('Kết quả đối chiếu')}>
        {stale&&<p className="lx-notice is-warn" role="alert">{tr('Một bài đã đổi phiên bản sau khi kiểm tra. Hãy kiểm tra lại trước khi sử dụng kết quả.')}</p>}
        <SimilarityResults report={currentReport} language={language} scopeLabel={scopeLabel} stale={stale} reflections={reflections} onOpen={onOpen}/>
      </section>
      :<p className="lx-scan-wait">{tr('Chọn phạm vi rồi bấm Đối chiếu. Các cặp bài tương đồng sẽ hiện tại đây.')}</p>}
    <details className="lx-disclosure"><summary>{tr('Cách đối chiếu và giới hạn')}</summary><p>{tr('Tỷ lệ trùng là tín hiệu để xem xét, không phải kết luận đạo văn.')}</p><p>{tr('Đối chiếu cụm 5 từ liên tiếp, bỏ qua khác biệt hoa/thường và dấu câu, cùng các câu hướng dẫn tuần. Hiển thị khi có ít nhất 8 cụm chung và ít nhất 10% từ của một bài trùng. Không so sánh các bài của cùng một sinh viên.')}</p><p>{tr('Chỉ kiểm tra bài đã nộp hoặc hoàn thành. Chưa đối chiếu Internet, trường khác, nội dung ảnh hay văn bản được diễn đạt lại. Không dùng kết quả để tự động trừ điểm.')}</p></details>
  </div>;
}

export function SimilarityResults({report,language,scopeLabel,stale=false,reflections=[],onOpen}:{report:SimilarityReport;language:Language;scopeLabel:string;stale?:boolean;reflections?:Reflection[];onOpen:(id:string)=>void}){
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  const title=(doc:SimilaritySource)=>demoText(doc.title,doc.id,language)||tr('Reflection chưa đặt tên');
  return <>
    <header className="lx-sim-summary" title={`${scopeLabel} · ${tr('{0} bài · {1} cặp đã đối chiếu',[report.documents,report.comparedPairs])}`}>
      <h2>{report.matchedPairs?tr('{0} cặp bài cần xem xét',[report.matchedPairs]):tr(report.comparedPairs?'Chưa thấy đoạn trùng đáng chú ý':'Chưa đủ bài để đối chiếu')}</h2>
      <p>{tr('Kiểm tra lúc {0}',[formatDate(report.checkedAt,language,true)])}</p>
    </header>
    {report.matchedPairs>report.matches.length&&<p className="lx-notice">{tr('Hiển thị 200 cặp có tỷ lệ trùng cao nhất. Chọn học phần cụ thể để thu hẹp kết quả.')}</p>}
    {report.matches.length>0&&<ol className="lx-sim-list">{report.matches.map((match,index)=>{
      const flip=report.reflectionId?match.right.id===report.reflectionId:!!report.studentId&&match.right.userId===report.studentId;
      const docs=flip?[match.right,match.left]:[match.left,match.right],rates=flip?[match.coverageRight,match.coverageLeft]:[match.coverageLeft,match.coverageRight];
      const top=Math.max(...rates);
      return <li key={`${match.left.id}:${match.right.id}`}><details open={index===0}>
        <summary>
          <span className="lx-sim-no">{index+1}</span>
          <span className="lx-sim-pair">{docs.map(doc=><b key={doc.id}><i aria-hidden="true"/>{doc.studentName}</b>)}</span>
          <span className={`lx-sim-rate is-${top>=50?'high':top>=25?'mid':'low'}`} title={tr('{0}% và {1}% số từ của mỗi bài',rates)}><b><small className="lx-sim-rate-label">{tr('Trùng lặp')}</small>{top}%</b><i><s style={{width:`${top}%`}}/></i></span>
          <UiIcon name="chevron" size={16}/>
        </summary>
        <div className="lx-sim-body">
          {docs.map((doc,j)=>{const own=match.excerpts.map(e=>(flip?[e.right,e.left]:[e.left,e.right])[j]),content=reflections.find(r=>r.id===doc.id)?.content;
            // Seeded demo work has an English version of each whole section, not of single passages; authored work stays verbatim.
            const sections=[...new Set(own.map(part=>part.section))];
            const english=language==='en'&&content?sections.map(section=>demoText(content[section],doc.id,language)).filter((text,i)=>text!==content[sections[i]]):[];
            const passages=english.length&&english.length===sections.length?english:own.map(part=>part.text);
            return <section className="lx-sim-side" key={doc.id}>
              <header><span><b>{doc.studentName}</b><small>{title(doc)}</small></span>
                <button type="button" className="lx-link" disabled={stale} onClick={()=>onOpen(doc.id)}>{tr('Mở bài')}<UiIcon name="arrow" size={13}/></button></header>
              <div className="lx-sim-passages">{passages.map((text,i)=><p key={i}>{text}</p>)}</div>
            </section>})}
        </div>
      </details></li>;
    })}</ol>}
    {!report.matches.length&&<p className="lx-scan-wait">{tr(report.comparedPairs?'Không có cặp đạt ngưỡng hiển thị. Kết quả không xác nhận bài hoàn toàn nguyên gốc.':'Cần ít nhất hai bài từ hai sinh viên khác nhau, mỗi bài ít nhất 40 từ.')}</p>}
  </>;
}
