'use client';
import { translate, type Language } from '../lib/i18n';
import UiIcon from './UiIcon';

export default function PublicHome({language,continueHref}:{language:Language;continueHref:string}) {
  const tr=(text:string)=>translate(text,language);
  const questions=[
    ['THINK UP dành cho ai?','Sinh viên dùng để viết reflection và theo dõi hành trình. Giảng viên đọc, phản hồi và đánh giá bài nộp; quản trị viên quản lý tài khoản và học phần.'],
    ['AI có viết bài thay tôi không?','Bạn tự viết bằng trải nghiệm và suy nghĩ của mình. AI Coach đặt câu hỏi gợi mở; AI Feedback đối chiếu rubric để bạn tự hoàn thiện bài.'],
    ['Giảng viên đánh giá như thế nào?','Bài được đánh giá theo bốn tiêu chí: chiều sâu phản tư, minh chứng và bối cảnh, bài học rút ra, kế hoạch hành động. Giảng viên xác nhận điểm và mức Kember cuối cùng.'],
    ['Làm sao để bắt đầu?','Tạo tài khoản sinh viên và bắt đầu viết. Để nộp bài trong lớp, quản trị viên cần phân công bạn vào học phần. Tài khoản giảng viên do quản trị viên cấp.'],
  ];
  const audiences=[
    {id:'for-students',icon:'editor' as const,title:'Dành cho sinh viên',intro:'Hiểu sâu trải nghiệm. Chủ động trưởng thành.',description:'Biến mỗi trải nghiệm học tập thành bài học có ý nghĩa, với không gian viết và sự đồng hành từ AI cùng giảng viên.',features:[
      ['Viết và lưu giữ suy nghĩ','Viết bài phản tư, đính kèm minh chứng và lưu lại các phiên bản để nhìn thấy suy nghĩ của mình thay đổi.'],
      ['Khơi mở góc nhìn cùng AI','Nhận câu hỏi gợi mở từ AI Coach và phản hồi theo rubric để tự hoàn thiện bài viết.'],
      ['Nhìn thấy từng bước tiến','Nhận góp ý từ giảng viên, đặt cam kết hành động và theo dõi tiến bộ qua từng tuần.'],
    ],href:continueHref,cta:'Bắt đầu hành trình'},
    {id:'for-lecturers',icon:'lecturer' as const,title:'Dành cho giảng viên',intro:'Thấu hiểu người học. Đồng hành đúng lúc.',description:'Kết nối bài viết, phản hồi và tiến bộ của sinh viên trong một không gian, giúp việc hướng dẫn phản tư rõ ràng và liền mạch hơn.',features:[
      ['Nắm bắt tình hình lớp học','Theo dõi bài nộp và tiến độ theo học phần để biết sinh viên nào cần được hỗ trợ.'],
      ['Phản hồi và đánh giá rõ ràng','Đọc bài, góp ý, trả bài chỉnh sửa và xác nhận đánh giá cuối cùng theo rubric.'],
      ['Đồng hành từ suy nghĩ đến hành động','Theo dõi cam kết và kết quả thực hiện để giúp sinh viên đưa bài học vào thực tế.'],
    ],href:'/login',cta:'Đăng nhập dành cho giảng viên'},
  ];
  return <main id="main-content" tabIndex={-1} className="home-content home-redesign">
    <section className="home-hero" id="about-us" aria-labelledby="home-title">
      <div className="home-hero-copy" data-reveal>
        <span className="hero-kicker">{tr('KHÔNG GIAN HỌC TẬP PHẢN TƯ')}</span>
        <h1 id="home-title">{tr('Cùng suy ngẫm.')}<br/><span>{tr('Cùng tiến bộ.')}</span></h1>
        <p>{tr('ThinkUp là không gian học tập phản tư dành cho sinh viên và giảng viên: nhìn lại trải nghiệm, trao đổi phản hồi và biến bài học thành hành động.')}</p>
        <div className="home-hero-actions"><a className="button primary" href={continueHref}>{tr('Bắt đầu hành trình')}<UiIcon name="next" size={18}/></a><a className="home-explore" href="#questions">{tr('Khám phá THINK UP')}<UiIcon name="down" size={16}/></a></div>
      </div>
    </section>
    <section className="home-questions home-section" id="questions" aria-labelledby="questions-title"><div className="home-section-heading" data-reveal><span className="eyebrow">{tr('HỎI ĐÁP VỀ THINKUP')}</span><h2 id="questions-title">{tr('Trước khi bắt đầu')}</h2><p>{tr('Một vài điều để bạn hiểu hơn về THINK UP.')}</p></div><div className="home-faq-list" data-reveal>{questions.map(([question,answer])=><details key={question}><summary>{tr(question)}<span className="faq-toggle" aria-hidden="true"/></summary><p>{tr(answer)}</p></details>)}</div></section>
    {audiences.map(audience=><section className="home-audiences home-section" id={audience.id} key={audience.id} aria-labelledby={`${audience.id}-title`}>
      <div className="home-section-heading audience-introduction" data-reveal><span className="audience-role"><UiIcon name={audience.icon} size={20}/>{tr(audience.title)}</span><h2 id={`${audience.id}-title`}>{tr(audience.intro)}</h2><p>{tr(audience.description)}</p></div>
      <div className="audience-details"><div className="home-audience-grid">{audience.features.map(([title,description])=><article key={title}><UiIcon name="check" size={16}/><div><h3>{tr(title)}</h3><p>{tr(description)}</p></div></article>)}</div><a className="text-button home-audience-link" href={audience.href}>{tr(audience.cta)}<UiIcon name="next" size={17}/></a></div>
      <div className="feature-demo" data-reveal>
        <span className="demo-caption">{tr('Minh họa tính năng')}</span>
        <div className="demo-document">
          <div className="demo-document-bar"><span><UiIcon name={audience.icon} size={16}/>{tr(audience.id==='for-students'?'Bài phản tư':'Nhận xét của giảng viên')}</span><span className="demo-status">{tr(audience.id==='for-students'?'Bản nháp':'Đã nộp')}</span></div>
          <div className="demo-document-body"><small>{tr('Tuần 01')} · {tr('Học từ trải nghiệm')}</small><h3>{tr('Nhìn lại buổi làm việc nhóm')}</h3><p>{tr('Trong buổi làm việc nhóm, tôi nhận ra mọi người đang hiểu mục tiêu theo những cách khác nhau.')}</p><p className="demo-highlight">{tr('Tôi học được rằng làm rõ kỳ vọng trước khi bắt đầu giúp cả nhóm phối hợp tốt hơn.')}</p></div>
          <div className="demo-document-note"><span className="demo-note-icon"><UiIcon name={audience.id==='for-students'?'coach':'lecturer'} size={20}/></span><div><strong>{audience.id==='for-students'?'AI Coach':tr('Gợi ý để phát triển bài viết')}</strong><p>{tr(audience.id==='for-students'?'Điều gì đã thay đổi khi bạn bắt đầu lắng nghe góc nhìn của người khác?':'Em hãy bổ sung một tình huống cụ thể để làm rõ sự thay đổi trong cách làm việc của nhóm.')}</p></div></div>
          <div className="demo-document-footer"><UiIcon name="check" size={14}/>{tr(audience.id==='for-students'?'Bạn tự viết. THINK UP đồng hành.':'Phản hồi để hiểu sâu hơn, tiến bộ hơn.')}</div>
        </div>
      </div>
    </section>)}
    <section className="home-final" data-reveal><span className="eyebrow">{tr('MỘT TRANG MỚI, MỘT BƯỚC TIẾN')}</span><h2>{tr('Câu chuyện tiếp theo')}<br/>{tr('bắt đầu từ bạn.')}</h2><p>{tr('Một trải nghiệm nhỏ hôm nay có thể mở ra một thay đổi lớn ngày mai.')}</p><a className="button primary" href={continueHref}>{tr('Bắt đầu hành trình')}<UiIcon name="next" size={18}/></a></section>
  </main>;
}
