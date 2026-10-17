'use client';
import { useEffect, useRef, useState } from 'react';
import { translate, dateLocale, type Language } from '../lib/i18n';
import { demoText } from '../lib/demo-i18n';
import type { Reflection } from '../lib/domain';
import type { SimilarityReport, SimilaritySource } from '../lib/similarity';

type Props={language:Language;courseId:string;courseName:string;reflections:Reflection[];reflectionId?:string;onOpen:(id:string)=>void};
export default function SimilarityPanel({language,courseId,courseName,reflections,reflectionId,onOpen}:Props) {
  const tr=(text:string,values:readonly unknown[]=[])=>translate(text,language,values);
  const [report,setReport]=useState<SimilarityReport|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const scope=`${courseId}:${reflectionId||''}`,controller=useRef<AbortController|null>(null);
  const [reportScope,setReportScope]=useState('');
  useEffect(()=>()=>controller.current?.abort(),[scope]);
  const currentReport=reportScope===scope?report:null;
  const stale=!!currentReport&&(currentReport.versions.some(doc=>{const row=reflections.find(r=>r.id===doc.id);return !row||row.latestVersion!==doc.versionId||!['submitted','final'].includes(row.status)})||reflections.some(r=>currentReport.courseIds.includes(r.courseId||'')&&['submitted','final'].includes(r.status)&&r.updatedAt>currentReport.checkedAt));
  async function scan() {
    controller.current?.abort();const abort=new AbortController();controller.current=abort;
    setBusy(true);setError('');setReport(null);setReportScope(scope);
    try{
      const response=await fetch('/api/similarity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({courseId:courseId||null,reflectionId:reflectionId||null}),signal:abort.signal});
      const data=await response.json() as SimilarityReport&{error?:string};
      if(!response.ok)throw new Error(data.error||'Không thể kiểm tra trùng lặp.');
      if(!abort.signal.aborted)setReport(data);
    }catch(caught){if(!abort.signal.aborted)setError(caught instanceof Error?caught.message:'Không thể kiểm tra trùng lặp.')}
    finally{if(controller.current===abort)setBusy(false)}
  }
  const title=(doc:SimilaritySource)=>demoText(doc.title,doc.id,language);
  return <section className="panel similarity-panel">
    <div className="section-head"><div><span className="eyebrow">{tr('LIÊM CHÍNH HỌC THUẬT')}</span><h3>{tr('Kiểm tra trùng lặp')}</h3><p className="muted">{tr('Đối chiếu các bài đã nộp của những sinh viên khác nhau trong phạm vi bạn được phân công.')}</p></div><button className="button primary" disabled={busy} onClick={()=>void scan()}>{tr(busy?'Đang đối chiếu…':'Kiểm tra ngay')}</button></div>
    <div className="similarity-scope"><span className="pill">{courseName||tr('Tất cả học phần được cấp quyền')}</span>{reflectionId&&<span className="pill">{tr('Bài đang đánh giá')}</span>}<small>{tr('So sánh văn bản trong hệ thống, không dùng AI và không gửi bài ra ngoài.')}</small></div>
    <p className="notice">{tr('Tỷ lệ trùng lặp là tín hiệu để xem xét, không phải kết luận đạo văn. Giảng viên cần đối chiếu trích dẫn, bối cảnh và bài làm trước khi nhận xét.')}</p>
    {reportScope===scope&&error&&<p className="auth-error" role="alert">{tr(error)}</p>}
    {currentReport?<>
      <div className="similarity-summary" role="status"><span><b>{currentReport.documents}</b> {tr('bài trong phạm vi')}</span><span><b>{currentReport.comparedPairs}</b> {tr('cặp bài đã đối chiếu')}</span><span><b>{currentReport.matchedPairs}</b> {tr('cặp cần xem xét')}</span></div>
      {currentReport.matchedPairs>currentReport.matches.length&&<p className="notice">{tr('Hiển thị 200 cặp có tỷ lệ trùng cao nhất. Chọn học phần cụ thể để thu hẹp kết quả.')}</p>}
      <small className="muted">{tr('Kiểm tra lúc {0}',[new Date(currentReport.checkedAt).toLocaleString(dateLocale(language),{timeZone:'Asia/Ho_Chi_Minh'})])} · {tr('{0} bài bỏ qua do ít hơn 40 từ hoặc chỉ có nội dung hướng dẫn.',[currentReport.skipped])}</small>
      {stale&&<p className="notice warning">{tr('Một bài đã đổi phiên bản sau khi kiểm tra. Hãy kiểm tra lại trước khi sử dụng kết quả.')}</p>}
      {currentReport.matches.map(match=><article className="similarity-match" key={`${match.left.id}:${match.right.id}`}>
        <div className="comparison-head">{[match.left,match.right].map((doc,i)=><div key={doc.id}><span className="badge returned">{i===0?match.coverageLeft:match.coverageRight}% {tr('từ trùng')}</span><h4>{title(doc)}</h4><p>{doc.studentName} · {doc.studentEmail}</p><small>{demoText(doc.courseName,doc.courseId,language)}</small><button className="text-button" disabled={stale} onClick={()=>onOpen(doc.id)}>{tr('Mở bài để đánh giá ↗')}</button></div>)}</div>
        <p className="muted">{tr('Các đoạn đối chiếu giữ nguyên ngôn ngữ bài gốc.')}</p>
        {match.excerpts.map((excerpt,i)=><div className="comparison-excerpts" key={i}><blockquote><small>{excerpt.left.section==='soWhat'?'So what?':excerpt.left.section==='nowWhat'?'Now what?':excerpt.left.section==='what'?'What?':'Action'}</small>{excerpt.left.text}</blockquote><blockquote><small>{excerpt.right.section==='soWhat'?'So what?':excerpt.right.section==='nowWhat'?'Now what?':excerpt.right.section==='what'?'What?':'Action'}</small>{excerpt.right.text}</blockquote></div>)}
      </article>)}
      {!currentReport.matches.length&&<div className="empty"><h4>{tr(currentReport.comparedPairs?'Chưa thấy đoạn trùng đáng chú ý':'Chưa đủ bài để đối chiếu')}</h4><p>{tr(currentReport.comparedPairs?'Không có cặp đạt ngưỡng hiển thị trong lần kiểm tra này. Kết quả không xác nhận bài hoàn toàn nguyên gốc.':'Cần ít nhất hai bài từ hai sinh viên khác nhau, mỗi bài ít nhất 40 từ.')}</p></div>}
    </>:<div className="empty"><h4>{tr('Đọc minh chứng trước khi kết luận')}</h4><p>{tr('Mỗi kết quả hiển thị tỷ lệ từ trùng của từng bài và các đoạn tương ứng để bạn kiểm tra trực tiếp.')}</p></div>}
    <details className="similarity-method"><summary>{tr('Cách đối chiếu và giới hạn')}</summary><p>{tr('Đối chiếu cụm 5 từ liên tiếp, bỏ qua khác biệt hoa/thường và dấu câu, cùng các câu hướng dẫn tuần. Hiển thị khi có ít nhất 8 cụm chung và ít nhất 10% từ của một bài trùng. Không so sánh các bài của cùng một sinh viên.')}</p><p>{tr('Chỉ kiểm tra bài đã nộp hoặc hoàn thành. Chưa đối chiếu Internet, trường khác, nội dung ảnh hay văn bản được diễn đạt lại. Không dùng kết quả để tự động trừ điểm.')}</p></details>
  </section>;
}
