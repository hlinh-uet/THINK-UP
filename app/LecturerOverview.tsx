'use client';

import { useState } from 'react';
import type { Action, Course, Criterion, Data, LearningRecord, Reflection, User } from '../lib/domain';
import { lecturerHref, type LecturerQuery } from '../lib/lecturer-pages';
import { learnerProgress } from '../lib/progress';
import { translate, type Language } from '../lib/i18n';
import UiIcon from './UiIcon';
import { dayKey, daysSince, longDate } from './LecturerKit';

type Props={language:Language;query:LecturerQuery;userName?:string;userId?:string;courses:Course[];students:User[];memberships:Data['memberships'];
  reflections:Reflection[];actions:Action[];records:LearningRecord[];rubric:Criterion[];detailHref:(id:string)=>string;studentHref:(id:string)=>string};

export default function LecturerOverview({language,query,userName,userId,students,reflections,actions,records,rubric,detailHref}:Props){
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  const common={course:query.course,cohort:query.cohort};
  const [now]=useState(()=>Date.now()),today=dayKey(now);
  const queue=reflections.filter(r=>r.status==='submitted').sort((a,b)=>a.updatedAt.localeCompare(b.updatedAt));
  const first=queue[0];
  const drafts=records.filter(d=>d.kind==='review-draft'&&d.ownerId===userId&&reflections.some(r=>r.id===d.reflectionId&&r.status==='submitted'));
  const silent=students.filter(u=>u.active&&!reflections.some(r=>r.userId===u.id));
  const watch=students.filter(u=>{
    const own=actions.filter(a=>a.userId===u.id),progress=learnerProgress(reflections.filter(r=>r.userId===u.id));
    return own.some(a=>(a.due&&a.due<today&&a.status!=='done')||a.status==='needs_adjustment')
      ||rubric.some(c=>{const avg=progress.criteria.find(x=>x.key===c.key)?.average;return avg!=null&&avg<5.1});
  });
  const returned=reflections.filter(r=>r.status==='returned').length;
  const notes=[
    {key:'review',tone:'yellow',icon:'document' as const,title:tr('Chấm bài reflection'),text:tr('{0} bài đang chờ bạn đánh giá.',[queue.length]),
      detail:first?`${first.studentName} · ${tr('Tuần {0}',[first.week])} · ${tr('chờ {0} ngày',[daysSince(first.updatedAt,now)])}`:tr('Không có bài nào đang chờ duyệt.'),
      href:first?detailHref(first.id):lecturerHref('submissions',common),action:tr(first?'Bắt đầu chấm':'Xem bài nộp')},
    {key:'draft',tone:'blue',icon:'editor' as const,title:tr('Tiếp tục góp ý'),text:tr('{0} đánh giá đang lưu nháp.',[drafts.length]),
      detail:drafts.length?tr('Hoàn thiện phần nhận xét trước khi gửi lại sinh viên.'):tr('Các nhận xét đang soạn sẽ xuất hiện ở đây.'),
      href:drafts[0]?.reflectionId?detailHref(drafts[0].reflectionId):lecturerHref('submissions',common),action:tr(drafts.length?'Tiếp tục đánh giá':'Mở danh sách bài')},
    {key:'students',tone:'pink',icon:'users' as const,title:tr('Đồng hành cùng sinh viên'),text:tr('{0} sinh viên cần theo dõi.',[watch.length]),
      detail:tr('{0} sinh viên chưa có bài nộp.',[silent.length]),href:lecturerHref('students',common),action:tr('Xem sinh viên')},
    {key:'returned',tone:'green',icon:'actions' as const,title:tr('Theo dõi bài chỉnh sửa'),text:tr('{0} bài đang chờ sinh viên nộp lại.',[returned]),
      detail:tr('Xem lại góp ý và tiến trình hoàn thiện bài viết.'),href:lecturerHref('submissions',{...common,status:'returned'}),action:tr('Xem bài cần sửa')},
  ];
  const shortcuts=[
    {key:'students' as const,icon:'users' as const,title:tr('Quản lý sinh viên'),text:tr('Danh sách lớp và hồ sơ học tập của từng sinh viên.')},
    {key:'submissions' as const,icon:'document' as const,title:tr('Bài nộp & đánh giá'),text:tr('Đọc bài, gửi góp ý và xác nhận kết quả.')},
    {key:'progress' as const,icon:'progress' as const,title:tr('Phân tích lớp'),text:tr('Nhịp học, chất lượng phản tư và các cam kết.')},
    {key:'similarity' as const,icon:'similarity' as const,title:tr('Kiểm tra trùng lặp'),text:tr('Chọn phạm vi và đối chiếu các bài reflection.')},
    {key:'courses' as const,icon:'journey' as const,title:tr('Học phần & rubric'),text:tr('Nội dung từng tuần, hạn nộp và tiêu chí đánh giá.')},
    {key:'messages' as const,icon:'messages' as const,title:tr('Tin nhắn'),text:tr('Trao đổi với sinh viên và đồng nghiệp.')},
  ];
  return <div className="lx-stack lx-workdesk">
    <header className="lx-desk-heading">
      <h1>{tr('Bàn làm việc')}</h1>
      <p><span>{userName?tr('Chào {0}',[userName]):tr('Chào bạn')}</span><span className="lx-desk-meta-divider" aria-hidden="true">·</span><time dateTime={today}>{longDate(now,language)}</time></p>
    </header>
    <section className="lx-note-board" aria-label={tr('Ghi chú công việc')}>
      {notes.map((note,i)=><article className={`lx-sticky is-${note.tone}`} key={note.key}>
        <header><span className="lx-sticky-index">0{i+1}</span><UiIcon name={note.icon} size={19}/></header>
        <h2>{note.title}</h2><p className="lx-sticky-task"><span aria-hidden="true" className="lx-note-checkbox"/>{note.text}</p><p className="lx-sticky-detail">{note.detail}</p>
        <a href={note.href}>{note.action}<UiIcon name="next" size={15}/></a>
      </article>)}
    </section>
    <section className="lx-desk-shortcuts" aria-labelledby="desk-shortcuts-title">
      <header className="lx-section-head"><h2 id="desk-shortcuts-title">{tr('Bạn muốn làm gì tiếp?')}</h2></header>
      <nav className="lx-shortcut-list" aria-label={tr('Mở nhanh')}>{shortcuts.map(item=><a key={item.key} href={lecturerHref(item.key,common)}>
        <span className="lx-shortcut-icon"><UiIcon name={item.icon} size={21}/></span><span><b>{item.title}</b><small>{item.text}</small></span><UiIcon name="next" size={17}/>
      </a>)}</nav>
    </section>
  </div>;
}
