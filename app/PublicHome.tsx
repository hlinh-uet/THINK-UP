'use client';
import { useState } from 'react';
import { translate, type Language } from '../lib/i18n';
import UiIcon from './UiIcon';

export default function PublicHome({language,continueHref,hasAccount}:{language:Language;continueHref:string;hasAccount:boolean}) {
  const tr=(text:string)=>translate(text,language);
  const [section,setSection]=useState(0);
  const examples=[
    ['WHAT?','Nhìn lại trải nghiệm','Trong buổi làm việc nhóm, tôi nhận ra mọi người đang hiểu mục tiêu theo những cách khác nhau.'],
    ['SO WHAT?','Lắng nghe cảm xúc','Tôi thấy bối rối khi ý kiến của mình chưa được lắng nghe. Sau đó, tôi thử hỏi để hiểu góc nhìn của các bạn.'],
    ['NOW WHAT?','Tìm ra bài học','Tôi học được rằng làm rõ kỳ vọng trước khi bắt đầu giúp cả nhóm phối hợp tốt hơn.'],
    ['ACTION','Tạo nên thay đổi','Ở buổi họp tiếp theo, tôi sẽ cùng nhóm thống nhất mục tiêu và ghi lại việc mỗi người sẽ làm.'],
  ];
  const questions=[
    ['THINK UP dành cho ai?','Sinh viên dùng để viết reflection và theo dõi hành trình. Giảng viên đọc, phản hồi và đánh giá bài nộp; quản trị viên quản lý tài khoản và học phần.'],
    ['AI có viết bài thay tôi không?','Bạn tự viết bằng trải nghiệm và suy nghĩ của mình. AI Coach đặt câu hỏi gợi mở; AI Feedback đối chiếu rubric để bạn tự hoàn thiện bài.'],
    ['Giảng viên đánh giá như thế nào?','Bài được đánh giá theo bốn tiêu chí: chiều sâu phản tư, minh chứng và bối cảnh, bài học rút ra, kế hoạch hành động. Giảng viên xác nhận điểm và mức Kember cuối cùng.'],
    ['Làm sao để bắt đầu?','Tạo tài khoản sinh viên và bắt đầu viết. Để nộp bài trong lớp, quản trị viên cần phân công bạn vào học phần. Tài khoản giảng viên do quản trị viên cấp.'],
  ];
  return <main id="main-content" tabIndex={-1} className="home-content">
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-hero-copy" data-reveal><span className="hero-kicker"><UiIcon name="journey" size={16}/> {tr('Không gian cho những bước tiến nhỏ')}</span><h1 id="home-title">{tr('Học từ trải nghiệm.')}<br/><em>{tr('Tiến bộ qua từng tuần.')}</em></h1><p>{tr('Dành một chút thời gian để nhìn lại. Viết ra điều bạn học được, khám phá cùng AI Coach và biến suy nghĩ thành hành động.')}</p>
        <div className="home-hero-actions"><a className="button primary" href={continueHref}>{tr(hasAccount?'Tiếp tục hành trình':'Bắt đầu hành trình của bạn')}<UiIcon name="next" size={18}/></a><a className="button home-secondary" href="#how-it-works">{tr('Khám phá THINK UP')}<UiIcon name="down" size={17}/></a></div>
        <span className="hero-footnote">{tr('Bạn tự viết. THINK UP đồng hành.')}</span>
      </div>
      <div className="home-product" data-reveal>
        <div className="preview-topbar"><span className="preview-brand">think<span>up</span></span><span className="preview-caption">{tr('Minh họa không gian viết')}</span><span className="preview-avatar">L</span></div>
        <div className="preview-layout"><aside className="preview-nav" aria-hidden="true"><UiIcon name="overview"/><UiIcon name="editor"/><UiIcon name="journey"/><UiIcon name="progress"/></aside>
          <div className="preview-editor"><div className="preview-editor-meta"><span>{tr('Tuần 01')} · {tr('Reflection của tôi')}</span><span className="badge draft">{tr('Bản nháp')}</span></div><h2>{tr('Nhìn lại buổi làm việc nhóm')}</h2><p className="preview-intro">{tr('Một trải nghiệm. Bốn góc nhìn.')}</p>
            <div className="preview-tabs" aria-label={tr('Bốn phần reflection')}>{examples.map(([label],i)=><button key={label} aria-pressed={section===i} className={section===i?'selected':''} onClick={()=>setSection(i)}>{label}</button>)}</div>
            <div className="preview-writing" key={section}><span className="eyebrow">{tr(examples[section][1])}</span><p>{tr(examples[section][2])}</p><span className="preview-caret" aria-hidden="true"/></div>
            <div className="preview-editor-bottom"><span><UiIcon name="check" size={14}/>{tr('Không gian để suy nghĩ rõ hơn')}</span><UiIcon name="attachment" size={17}/></div>
          </div>
          <aside className="preview-coach"><span className="preview-coach-icon"><UiIcon name="coach" size={24}/></span><span className="eyebrow">AI COACH</span><h3>{tr('Một câu hỏi tốt.')}<br/>{tr('Một góc nhìn mới.')}</h3><p>{tr('Điều gì đã thay đổi khi bạn bắt đầu lắng nghe góc nhìn của người khác?')}</p><div className="preview-coach-divider"/><small>{tr('Gợi mở để bạn tự tìm câu trả lời.')}</small></aside>
        </div>
      </div>
      <div className="home-foundations" data-reveal><span><b>04</b>{tr('góc nhìn phản tư')}</span><span><b>09</b>{tr('tuần thực hành')}</span><span><UiIcon name="lecturer" size={24}/>{tr('Giảng viên đồng hành')}</span></div>
    </section>
    <section className="home-process home-section" id="how-it-works">
      <div className="home-section-heading" data-reveal><span className="eyebrow">{tr('TỪ SUY NGẪM ĐẾN THAY ĐỔI')}</span><h2>{tr('Không cần bắt đầu thật lớn.')}<br/><span>{tr('Chỉ cần bắt đầu từ bạn.')}</span></h2><p>{tr('Một trải nghiệm, một câu hỏi, một hành động. Từng bước nhỏ tạo nên hành trình học tập của riêng bạn.')}</p></div>
      <div className="home-process-grid">{[['01','editor','Viết từ trải nghiệm','Ghi lại điều đã xảy ra, cảm xúc, bài học và điều bạn muốn làm khác đi.'],['02','coach','Khám phá cùng Coach','Nhận câu hỏi gợi mở, đối chiếu rubric và tự hoàn thiện bài viết của bạn.'],['03','actions','Hành động và trưởng thành','Xác nhận cam kết, ghi lại kết quả và nhìn lại thay đổi qua 9 tuần.']].map(([number,icon,title,description])=><article key={number} data-reveal><div className="process-step-head"><span className="process-number">{number}</span><UiIcon name={icon as 'editor'|'coach'|'actions'} size={26}/></div><h3>{tr(title)}</h3><p>{tr(description)}</p></article>)}</div>
    </section>
    <section className="home-audiences home-section" id="for-you">
      <div className="home-section-heading" data-reveal><span className="eyebrow">{tr('CÙNG NHAU TIẾN BỘ')}</span><h2>{tr('Một hành trình chung.')}<br/><span>{tr('Một không gian cho mỗi người.')}</span></h2><p>{tr('Từ bài viết cá nhân đến lớp học, mọi người đều có một nơi để tập trung vào việc của mình.')}</p></div>
      <div className="home-audience-grid">{[['editor','Sinh viên','Hiểu mình qua từng bài viết.','Viết reflection, lưu phiên bản, nhận phản hồi và theo dõi hành trình cá nhân.'],['lecturer','Giảng viên','Đồng hành, không bỏ sót.','Theo dõi bài nộp, đưa nhận xét, trả bài chỉnh sửa và xác nhận đánh giá cuối cùng.'],['admin','Quản trị viên','Mọi thứ kết nối với nhau.','Quản lý tài khoản, phân quyền, học phần, rubric và hành trình học tập.']].map(([icon,role,title,description])=><article key={role} data-reveal><span className="audience-role"><UiIcon name={icon as 'editor'|'lecturer'|'admin'} size={18}/>{tr(role)}</span><h3>{tr(title)}</h3><p>{tr(description)}</p><a className="text-button" href={role==='Sinh viên'?continueHref:'/login'}>{tr(role==='Sinh viên'?'Bắt đầu viết':'Vào không gian của tôi')}<UiIcon name="next" size={17}/></a></article>)}</div>
    </section>
    <section className="home-questions home-section" id="questions"><div className="home-section-heading" data-reveal><span className="eyebrow">{tr('BẠN CÓ THỂ ĐANG TÒ MÒ')}</span><h2>{tr('Trước khi bắt đầu.')}</h2><p>{tr('Một vài điều để bạn hiểu hơn về THINK UP.')}</p></div><div className="home-faq-list" data-reveal>{questions.map(([question,answer])=><details key={question}><summary>{tr(question)}<span className="faq-toggle" aria-hidden="true"/></summary><p>{tr(answer)}</p></details>)}</div></section>
    <section className="home-final" data-reveal><span className="eyebrow">{tr('MỘT TRANG MỚI, MỘT BƯỚC TIẾN')}</span><h2>{tr('Câu chuyện tiếp theo')}<br/>{tr('bắt đầu từ bạn.')}</h2><p>{tr('Một trải nghiệm nhỏ hôm nay có thể mở ra một thay đổi lớn ngày mai.')}</p><a className="button primary" href={continueHref}>{tr(hasAccount?'Tiếp tục hành trình':'Tạo tài khoản sinh viên')}<UiIcon name="next" size={18}/></a></section>
  </main>;
}
