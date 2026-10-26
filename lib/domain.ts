export const sectionKeys = ['what','soWhat','nowWhat','action'] as const;
export type SectionKey = typeof sectionKeys[number];
export type Content = Record<SectionKey,string>;
export const criterionKeys = ['reflectionDepth','evidenceContext','insight','actionPlan'] as const;
export type CriterionKey = typeof criterionKeys[number];
// Legacy keys remain readable in historical snapshots; new configurations use criterionKeys.
export type Criterion = {key:CriterionKey|SectionKey;name:string;label:string;weight:number;descriptions:string[]};
export type Week = {week:number;title:string;prompt:string;due:string;requirements?:string};
export const emptyContent:Content = {what:'',soWhat:'',nowWhat:'',action:''};
export const writingSections = [
 {key:'what',name:'Mô tả trải nghiệm',label:'What?'},
 {key:'soWhat',name:'Phân tích & cảm xúc',label:'So what?'},
 {key:'nowWhat',name:'Nhận thức & bài học',label:'Now what?'},
 {key:'action',name:'Chuyển hóa thành hành động',label:'Action'},
] as const;
export const rubricSpecification = 'thinkup-final-v3';
export const defaultRubric:Criterion[] = [
 {key:'reflectionDepth',name:'Độ sâu phản tư',label:'Reflection Depth',weight:35,descriptions:[
  'Mới dừng ở mô tả: chỉ liệt kê sự kiện, nêu lại diễn biến mà không phân tích suy nghĩ hay cảm xúc cá nhân.',
  'Bắt đầu phân tích: nêu được cảm xúc, nhận diện vấn đề hoặc khó khăn nhưng giải thích còn bề nổi, cảm tính.',
  'Phản tư rõ ràng: phân tích nguyên nhân gốc rễ, đối chiếu với kiến thức hoặc kinh nghiệm, nhận ra điểm mạnh và điểm yếu của bản thân.',
  'Phản tư phản biện sâu: đánh giá đa chiều, nghi ngờ giả định ban đầu và rút ra nguyên lý hoặc góc nhìn mới.',
 ]},
 {key:'evidenceContext',name:'Chất lượng bằng chứng & bối cảnh',label:'Evidence & Context Quality',weight:25,descriptions:[
  'Nói chung chung, không có ví dụ hoặc bối cảnh cụ thể, như “Hôm nay học bài thấy khó”.',
  'Nêu được môn học hoặc sự việc nhưng ví dụ còn mơ hồ, thiếu chi tiết thực tế.',
  'Đưa ra câu chuyện hoặc tình huống cụ thể trong lớp học, chi tiết công việc hoặc đoạn hội thoại thực tế.',
  'Bằng chứng rất cụ thể: trích dẫn rõ tình huống, dữ liệu hoặc sơ đồ, ảnh sản phẩm đính kèm để làm rõ lập luận.',
 ]},
 {key:'insight',name:'Bài học rút ra',label:'Insight Realized',weight:20,descriptions:[
  'Không rút ra bài học hoặc bài học sáo rỗng, học thuộc lòng, như “Cần cố gắng hơn”.',
  'Rút ra bài học nhưng chưa liên kết rõ với trải nghiệm vừa trải qua.',
  'Nhận ra bài học cụ thể về tư duy, thái độ hoặc kỹ năng làm việc.',
  'Bài học có căn cứ, khái quát thành nguyên tắc cho tình huống tương lai; giải thích điều kiện và giới hạn áp dụng.',
 ]},
 {key:'actionPlan',name:'Kế hoạch ứng dụng',label:'Action Plan',weight:20,descriptions:[
  'Không có kế hoạch hành động tiếp theo.',
  'Kế hoạch chung chung, thiếu tính khả thi, như “Lần sau sẽ làm tốt hơn”.',
  'Đưa ra các bước hành động cụ thể có thể thực hiện ngay trong tuần tiếp theo.',
  'Kế hoạch chi tiết theo SMART: rõ ràng, đo lường được, có thời hạn và có tính khả thi cao.',
 ]},
];
export function isSpecificationRubric(rubric:Criterion[]){return rubric.length===4&&rubric.every((c,i)=>c.key===criterionKeys[i])}
const titles=['Làm quen với reflection','Nhận diện trải nghiệm','Nhận diện cảm xúc','Phân tích nguyên nhân','Nhìn từ góc độ khác','Xác định bài học','Liên hệ với bản thân','Xây dựng kế hoạch thay đổi','Reflection tổng kết'];
const prompts=['Một trải nghiệm gần đây đã khiến bạn suy nghĩ điều gì?','Chi tiết nào trong trải nghiệm có ý nghĩa nhất với bạn?','Bạn đã cảm thấy thế nào, và vì sao?','Điều gì thực sự dẫn đến kết quả đó?','Một người khác có thể nhìn tình huống này thế nào?','Bạn đã hiểu thêm điều gì sau trải nghiệm?','Bài học này liên quan đến giá trị và thói quen của bạn ra sao?','Bạn sẽ thay đổi điều gì, khi nào và bằng cách nào?','Bạn đã thay đổi như thế nào qua 9 tuần thực hành?'];
export const defaultWeeks:Week[] = titles.map((title,i)=>({week:i+1,title,prompt:prompts[i],due:''}));
export const levels=['Chưa có đánh giá','Chưa phản tư','Thấu hiểu','Phản tư','Phản tư phản biện'];
export const kemberDefinitions=[
 'Bài viết hoàn toàn mô tả sự việc.',
 'Hiểu lý thuyết hoặc sự việc nhưng chưa liên hệ bản thân.',
 'Nhận thức được bài học và ảnh hưởng đối với bản thân.',
 'Thay đổi góc nhìn hoặc nhận thức cốt lõi.',
];
export const roles:Record<string,string>={student:'Sinh viên',lecturer:'Giảng viên',admin:'Quản trị viên'};
export const statuses:Record<string,string>={draft:'Bản nháp',submitted:'Chờ giảng viên',returned:'Cần chỉnh sửa',final:'Đã hoàn thành'};
export function wordCount(content:Content){return Object.values(content).join(' ').trim().split(/\s+/).filter(Boolean).length}
export function totalScore(scores:number[],rubric:Criterion[],scale:4|10=10){return Math.round(scores.reduce((sum,s,i)=>sum+s/scale*rubric[i].weight,0)*10)/100}
export function validateLevel(value:unknown):number{if(!Number.isInteger(value)||Number(value)<1||Number(value)>4)throw new Error('Chọn mức Kember từ 1 đến 4 dựa trên toàn bài viết.');return Number(value)}
export function validateScores(value:unknown):number[]{if(!Array.isArray(value)||value.length!==4||value.some(x=>typeof x!=='number'||!Number.isFinite(x)||x<0||x>10||Math.abs(x*10-Math.round(x*10))>1e-8))throw new Error('Mỗi tiêu chí cần điểm từ 0 đến 10, tối đa một chữ số thập phân.');return value}
export function validateRubric(value:unknown):Criterion[]{if(!Array.isArray(value)||value.length!==4)throw new Error('Rubric cần đủ 4 tiêu chí.');const list=value as Criterion[];if(list.some((r,i)=>!r||r.key!==criterionKeys[i]||typeof r.name!=='string'||!r.name.trim()||r.name.length>120||typeof r.label!=='string'||!r.label.trim()||r.label.length>120||r.weight!==defaultRubric[i].weight||!Array.isArray(r.descriptions)||r.descriptions.length!==4||r.descriptions.some(x=>typeof x!=='string'||!x.trim()||x.length>1000)))throw new Error('Rubric cần đúng 4 tiêu chí, trọng số 35% / 25% / 20% / 20% và 4 mô tả mỗi tiêu chí.');return list}
export function validateWeeks(value:unknown):Week[]{if(!Array.isArray(value)||value.length!==9)throw new Error('Hành trình cần đủ 9 tuần.');const weeks=value as Week[];if(weeks.some((w,i)=>w.week!==i+1||typeof w.title!=='string'||!w.title.trim()||w.title.length>150||typeof w.prompt!=='string'||!w.prompt.trim()||w.prompt.length>1000||(w.requirements!==undefined&&(typeof w.requirements!=='string'||w.requirements.length>3000))||typeof w.due!=='string'||(w.due!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(w.due))))throw new Error('Nội dung tuần hoặc ngày hạn chưa hợp lệ.');return weeks}
export type User = {permissions?:import('./permissions').Permission[];id:string;email:string;name:string;role:string;active:number;avatarUrl?:string};
export type Course = {id:string;name:string;code:string;className?:string;weeks:Week[];rubric:Criterion[]};
export type Version = {id:string;reflectionId:string;content:Content;title:string;stage:string;createdAt:string};
export type Analysis = {id:string;versionId:string;kind:string;provider:string;result:Feedback;createdAt:string;rubric:Criterion[]};
export type AssessmentCriterion = {key:CriterionKey|SectionKey;level:number|null;score:number|null;evidence:string;reason:string;improvement:string;attachmentNames:string[];missingReason?:string};
export type Feedback = {scoreScale?:4|10;reviewRequired?:boolean;language?:'en'|'vi';includedAttachments?:boolean;rubricSpecification?:string;levelMethod?:'ai-classification'|'demo-classification';levelReason?:string;levelEvidence?:string;strengths:string[];development:string[];questions:string[];suggestedActions:string[];criteria:{key:CriterionKey|SectionKey;score:number|null;level?:number|null;reviewRequired?:boolean;behavior:string;evidence:string;evidenceSection?:SectionKey|null;attachmentNames?:string[];improvement:string}[];level:number;total:number|null;weightedScore?:number|null;context:string};
export type Review = {id:string;versionId:string;reviewerId:string;comment:string;scores:number[];total:number|null;level:number|null;decision:string;createdAt:string;rubric:Criterion[];scoreScale?:4|10;criteria?:AssessmentCriterion[];rubricVersion?:string};
export type Attachment = {id:string;reflectionId:string;name:string;type:string;size:number;createdAt:string};
export type LearningRecord = {id:string;kind:string;ownerId:string;reflectionId:string|null;courseId:string|null;versionId:string|null;payload:Record<string,unknown>;revision:number;createdAt:string;updatedAt:string};
export type ReadingPoint = {text:string;evidence:string;section:SectionKey|null};
export type ReadingCriterion = ReadingPoint & {key:CriterionKey;status:'supported'|'insufficient'};
// Optional on historical reports; every newly generated report must include all four criteria.
export type ReadingReport = {summary:ReadingPoint[];thinking:ReadingPoint[];learning:ReadingPoint[];attention:ReadingPoint[];criteria?:ReadingCriterion[];feedback:{strengths:string;development:string;evidence:string;questions:string;nextSteps:string}};
export type Reflection = {id:string;userId:string;courseId:string|null;title:string;week:number;content:Content;status:string;rev:number;latestVersion:string;createdAt:string;updatedAt:string;versions:Version[];analyses:Analysis[];reviews:Review[];attachments:Attachment[];studentName?:string;studentEmail?:string;courseName?:string;className?:string;readingReports?:LearningRecord[];selfAssessments?:LearningRecord[];coachTurns?:{id:string;question:string;reply:string|null;createdAt:string}[];archived?:boolean};
export type Action = {id:string;userId:string;reflectionId:string|null;text:string;due:string;status:string;review:string;createdAt:string;successCriteria?:string;evidence?:string;evidenceFiles?:{id:string;name:string;type:string;size:number}[];attachmentIds?:string[];followUpReflectionId?:string|null;revision?:number;history?:LearningRecord[]};
export type Participation = {courseId:string;userId:string;week:number;status:string;count:number};
export type Data = {permissionPolicy?:import('./permissions').PermissionPolicy;user:User|null;local:boolean;aiReady:boolean;aiProviders?:('openai'|'codex')[];courses:Course[];reflections:Reflection[];actions:Action[];classReflections:Reflection[];classActions?:Action[];participation?:Participation[];learningRecords?:LearningRecord[];users:User[];memberships:{id:string;courseId:string;userId:string;role:string}[];invitations:{id:string;email:string;role:string;courseId:string|null;name:string}[];rubric:Criterion[];weeks:Week[];signIn?:string};
