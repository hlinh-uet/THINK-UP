'use client';

import { useState } from 'react';
import {actionOverdue} from '../lib/commitment-deadline';
import type { Action, Course, Criterion, Data, LearningRecord, Reflection, User } from '../lib/domain';
import { lecturerHref, type LecturerQuery } from '../lib/lecturer-pages';
import { demoText } from '../lib/demo-i18n';
import { learnerProgress } from '../lib/progress';
import { translate, type Language } from '../lib/i18n';
import UiIcon from './UiIcon';
import { WaitTag, dayKey, daysSince, longDate, waitTone } from './LecturerKit';

type Props={language:Language;query:LecturerQuery;userName?:string;userId?:string;courses:Course[];students:User[];memberships:Data['memberships'];
  reflections:Reflection[];actions:Action[];records:LearningRecord[];rubric:Criterion[];detailHref:(id:string)=>string;studentHref:(id:string)=>string};

export default function LecturerOverview({language,query,userName,userId,courses,students,reflections,actions,records,rubric,detailHref}:Props){
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  const common={course:query.course,cohort:query.cohort};
  const [now]=useState(()=>Date.now()),today=dayKey(now);
  const queue=reflections.filter(r=>r.status==='submitted').sort((a,b)=>a.updatedAt.localeCompare(b.updatedAt));
  const drafts=records.filter(d=>d.kind==='review-draft'&&d.ownerId===userId&&reflections.some(r=>r.id===d.reflectionId&&r.status==='submitted'));
  const watch=students.filter(u=>{
    const own=actions.filter(a=>a.userId===u.id),progress=learnerProgress(reflections.filter(r=>r.userId===u.id));
    return own.some(a=>actionOverdue(a,now)||a.status==='needs_adjustment')
      ||rubric.some(c=>{const avg=progress.criteria.find(x=>x.key===c.key)?.average;return avg!=null&&avg<5.1});
  });
  const returned=reflections.filter(r=>r.status==='returned').length;
  const tasks=[
    {key:'review',icon:'document' as const,title:tr('Bài chờ chấm'),count:queue.length,
      href:lecturerHref('submissions',{...common,status:'submitted'})},
    {key:'draft',icon:'editor' as const,title:tr('Đang chấm dở'),count:drafts.length,
      href:drafts[0]?.reflectionId?detailHref(drafts[0].reflectionId):lecturerHref('submissions',common)},
    {key:'students',icon:'users' as const,title:tr('Sinh viên cần theo dõi'),count:watch.length,
      href:lecturerHref('students',common)},
  ];
  return <div className="lx-stack lx-workdesk">
    <header className="lx-desk-heading">
      <div><span className="desk-eyebrow"><UiIcon name="lecturer" size={16}/>{tr('Không gian giảng dạy')}</span>
      <h1>{tr('Bàn làm việc')}</h1>
      <p>{userName?tr('Chào {0}.',[userName]):tr('Chào giảng viên.')} {tr('Cùng tiếp nối hành trình học tập của sinh viên.')}</p></div>
      <time dateTime={today}>{longDate(now,language)}</time>
    </header>
    <section className="lecturer-task-grid" aria-label={tr('Công việc cần xử lý')}>
      {tasks.map(task=><article className={`lecturer-task is-${task.key}`} key={task.key}><a href={task.href}>
        <span className="lecturer-task-icon"><UiIcon name={task.icon} size={20}/></span>
        <span className="lecturer-task-text"><b>{task.count}</b><span>{task.title}</span></span>
        <UiIcon name="next" size={16} className="lecturer-task-go"/>
      </a></article>)}
    </section>
    <div className="desk-columns">
    <section className="lecturer-queue" aria-labelledby="lecturer-queue-title">
      <header className="lecturer-queue-head">
        <span className="lecturer-queue-icon"><UiIcon name="document" size={22}/></span>
        <div><h2 id="lecturer-queue-title">{tr('Bài cần chấm tiếp theo')} <span className="desk-queue-count">{queue.length}</span></h2><p>{tr('Ưu tiên bài đã chờ lâu nhất')}</p></div>
        <a className="lx-link" href={lecturerHref('submissions',{...common,status:'submitted'})}>{tr('Xem tất cả')}<UiIcon name="next" size={15}/></a>
      </header>
      {queue.length?<ul className="lecturer-queue-list">{queue.slice(0,5).map((r,i)=>{const wait=daysSince(r.updatedAt,now);
        return <li key={r.id} className={i===0?`is-next is-${waitTone(wait)}`:undefined}><span className="lecturer-queue-rank" aria-hidden="true">{i+1}</span><div><a href={detailHref(r.id)}>{demoText(r.title,r.id,language)||tr('Reflection chưa đặt tên')}</a><div className="desk-review-meta"><span>{r.studentName} · {tr('Tuần {0}',[r.week])}</span><WaitTag days={wait} language={language}/></div></div><a className={`lx-btn${i===0?' is-primary':''}`} href={detailHref(r.id)}>{tr(i===0?'Bắt đầu chấm':'Chấm bài')}<UiIcon name="next" size={14}/></a></li>})}</ul>:<p className="lecturer-queue-empty">{tr('Không có bài nào đang chờ duyệt.')}</p>}
      <footer><div className="desk-returned-notice"><UiIcon name="document" size={16}/><span>{tr('{0} bài đang chờ sinh viên nộp lại.',[returned])}</span></div><a className="lx-link" href={lecturerHref('submissions',{...common,status:'returned'})}>{tr('Xem bài cần sửa')}<UiIcon name="next" size={14}/></a></footer>
    </section>
    <aside className="desk-aside" aria-label={tr('Thông tin giảng dạy')}>
      <section className="desk-courses"><header><h2><a className="desk-aside-title" href={lecturerHref('courses',common)}>{tr('Quản lý học phần')}<UiIcon name="next" size={18}/></a></h2></header>
        {courses.length?<ul>{courses.slice(0,4).map(course=><li key={course.id}><a href={lecturerHref('submissions',{...common,course:course.id})}><span className="desk-course-code">{course.code}</span><strong>{demoText(course.name,course.id,language)}</strong><span className="desk-course-meta">{course.className||course.code}<UiIcon name="arrow" size={16}/></span></a></li>)}</ul>:<p className="desk-aside-empty">{tr('Chưa có học phần trong phạm vi này.')}</p>}
      </section>
      <a className="desk-progress" href={lecturerHref('progress',common)}><h2 className="desk-aside-title"><UiIcon name="progress" size={20}/><span>{tr('Nhìn lại tiến độ lớp')}</span></h2><p>{tr('Theo dõi chất lượng phản tư và những thay đổi qua từng tuần.')}</p><span>{tr('Mở phân tích lớp')}<UiIcon name="next" size={16}/></span></a>
    </aside>
    </div>
  </div>;
}
