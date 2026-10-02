export const sectionKeys = ['what','soWhat','nowWhat','action'] as const;
export type SectionKey = typeof sectionKeys[number];
export type Content = Record<SectionKey,string>;
export type Criterion = {key:SectionKey;name:string;label:string;weight:number;descriptions:string[]};
export type Week = {week:number;title:string;prompt:string;due:string};
export const emptyContent:Content = {what:'',soWhat:'',nowWhat:'',action:''};
export const defaultRubric:Criterion[] = [
 {key:'what',name:'Mô tả trải nghiệm',label:'What?',weight:25,descriptions:['Kể lại sự kiện rời rạc, thiếu bối cảnh.','Mô tả rõ sự kiện, vai trò và kết quả.','Chọn chi tiết có ý nghĩa và nêu vấn đề cần phản tư.','Nhìn lại cách bản thân chọn và diễn giải trải nghiệm.']},
 {key:'soWhat',name:'Phân tích & cảm xúc',label:'So what?',weight:25,descriptions:['Nêu cảm xúc hoặc ý kiến, chưa giải thích.','Giải thích được nguyên nhân trực tiếp.','Liên hệ cảm xúc, nguyên nhân và các góc nhìn khác.','Xem xét giả định, thiên kiến và cách nhìn thay thế.']},
 {key:'nowWhat',name:'Nhận thức & bài học',label:'Now what?',weight:25,descriptions:['Nêu bài học chung chung.','Rút ra bài học liên quan đến trải nghiệm.','Liên hệ bài học với bản thân hoặc kiến thức đã học.','Thể hiện thay đổi nhận thức, kiểm tra lại giả định cũ.']},
 {key:'action',name:'Chuyển hóa thành hành động',label:'Action',weight:25,descriptions:['Nêu ý định chưa cụ thể.','Xác định hành động liên quan đến bài học.','Có hành động, thời hạn và cách kiểm tra kết quả.','Có kế hoạch thử nghiệm, đánh giá và điều chỉnh hành động.']}
];
const titles=['Làm quen với reflection','Nhận diện trải nghiệm','Nhận diện cảm xúc','Phân tích nguyên nhân','Nhìn từ góc độ khác','Xác định bài học','Liên hệ với bản thân','Xây dựng kế hoạch thay đổi','Reflection tổng kết'];
const prompts=['Một trải nghiệm gần đây đã khiến bạn suy nghĩ điều gì?','Chi tiết nào trong trải nghiệm có ý nghĩa nhất với bạn?','Bạn đã cảm thấy thế nào, và vì sao?','Điều gì thực sự dẫn đến kết quả đó?','Một người khác có thể nhìn tình huống này thế nào?','Bạn đã hiểu thêm điều gì sau trải nghiệm?','Bài học này liên quan đến giá trị và thói quen của bạn ra sao?','Bạn sẽ thay đổi điều gì, khi nào và bằng cách nào?','Bạn đã thay đổi như thế nào qua 9 tuần thực hành?'];
export const defaultWeeks:Week[] = titles.map((title,i)=>({week:i+1,title,prompt:prompts[i],due:''}));
export const levels=['Chưa có đánh giá','Hành động theo thói quen','Hiểu biết','Phản tư','Phản tư sâu'];
export const roles:Record<string,string>={student:'Sinh viên',lecturer:'Giảng viên',admin:'Quản trị viên'};
export const statuses:Record<string,string>={draft:'Bản nháp',submitted:'Chờ giảng viên',returned:'Cần chỉnh sửa',final:'Đã hoàn thành'};
export function wordCount(content:Content){return Object.values(content).join(' ').trim().split(/\s+/).filter(Boolean).length}
export function totalScore(scores:number[],rubric:Criterion[]){return Math.round(scores.reduce((sum,s,i)=>sum+(s/4)*rubric[i].weight,0)/10*100)/100}
export function depthLevel(scores:number[]){const avg=scores.reduce((a,b)=>a+b,0)/4;return avg<1.5?1:avg<2.5?2:avg<3.5?3:4}
export function validateScores(value:unknown):number[]{if(!Array.isArray(value)||value.length!==4||value.some(x=>!Number.isInteger(x)||x<1||x>4))throw new Error('Mỗi tiêu chí cần điểm nguyên từ 1 đến 4.');return value}
export function validateRubric(value:unknown):Criterion[]{if(!Array.isArray(value)||value.length!==4)throw new Error('Rubric cần đủ 4 tiêu chí.');const list=value as Criterion[];if(list.some((r,i)=>r.key!==sectionKeys[i]||typeof r.name!=='string'||!r.name.trim()||r.name.length>120||!Number.isInteger(r.weight)||r.weight<1||r.weight>97||!Array.isArray(r.descriptions)||r.descriptions.length!==4||r.descriptions.some(x=>typeof x!=='string'||!x.trim()||x.length>1000))||list.reduce((s,r)=>s+r.weight,0)!==100)throw new Error('Trọng số phải có tổng 100%; mỗi tiêu chí cần 4 mô tả mức độ.');return list}
export function validateWeeks(value:unknown):Week[]{if(!Array.isArray(value)||value.length!==9)throw new Error('Hành trình cần đủ 9 tuần.');const weeks=value as Week[];if(weeks.some((w,i)=>w.week!==i+1||typeof w.title!=='string'||!w.title.trim()||w.title.length>150||typeof w.prompt!=='string'||!w.prompt.trim()||w.prompt.length>1000||typeof w.due!=='string'||(w.due!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(w.due))))throw new Error('Nội dung tuần hoặc ngày hạn chưa hợp lệ.');return weeks}
export type User = {id:string;email:string;name:string;role:string;active:number};
export type Course = {id:string;name:string;code:string;weeks:Week[];rubric:Criterion[]};
export type Version = {id:string;reflectionId:string;content:Content;title:string;stage:string;createdAt:string};
export type Analysis = {id:string;versionId:string;kind:string;provider:string;result:Feedback;createdAt:string;rubric:Criterion[]};
export type Feedback = {language?:'en'|'vi';strengths:string[];development:string[];questions:string[];suggestedActions:string[];criteria:{key:SectionKey;score:number;behavior:string;evidence:string;improvement:string}[];level:number;total:number;context:string};
export type Review = {id:string;versionId:string;reviewerId:string;comment:string;scores:number[];total:number|null;level:number|null;decision:string;createdAt:string;rubric:Criterion[]};
export type Attachment = {id:string;reflectionId:string;name:string;type:string;size:number;createdAt:string};
export type Reflection = {id:string;userId:string;courseId:string|null;title:string;week:number;content:Content;status:string;rev:number;latestVersion:string;createdAt:string;updatedAt:string;versions:Version[];analyses:Analysis[];reviews:Review[];attachments:Attachment[];studentName?:string;studentEmail?:string;courseName?:string};
export type Action = {id:string;userId:string;reflectionId:string|null;text:string;due:string;status:string;review:string;createdAt:string};
export type Data = {user:User|null;local:boolean;aiReady:boolean;courses:Course[];reflections:Reflection[];actions:Action[];classReflections:Reflection[];users:User[];memberships:{id:string;courseId:string;userId:string;role:string}[];invitations:{id:string;email:string;role:string;courseId:string|null;name:string}[];rubric:Criterion[];weeks:Week[];signIn?:string};
