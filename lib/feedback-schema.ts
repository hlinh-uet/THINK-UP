import { criterionKeys, sectionKeys, rubricSpecification, totalScore, validateLevel, validateRubric, type Content, type Criterion, type Feedback } from './domain.ts';
import { criterionLevel } from './assessment.ts';
import { translate, type Language } from './i18n.ts';

const strings={type:'array',items:{type:'string',maxLength:1500},maxItems:8};
export const feedbackSchema={type:'object',additionalProperties:false,properties:{
 strengths:strings,development:strings,questions:strings,suggestedActions:strings,context:{type:'string',maxLength:2000},
 level:{type:'integer',minimum:1,maximum:4},levelReason:{type:'string',minLength:1,maxLength:1500},levelEvidence:{type:'string',minLength:1,maxLength:1500},
 criteria:{type:'array',minItems:4,maxItems:4,items:{type:'object',additionalProperties:false,properties:{
  key:{type:'string',enum:criterionKeys},level:{type:['integer','null'],minimum:1,maximum:4},score:{type:['number','null'],minimum:0,maximum:10},
  behavior:{type:'string',maxLength:1500},evidence:{type:'string',maxLength:1500},
  evidenceSection:{type:['string','null'],enum:[...sectionKeys,null]},attachmentNames:{type:'array',items:{type:'string'},maxItems:3},improvement:{type:'string',maxLength:1500},
 },required:['key','level','score','behavior','evidence','evidenceSection','attachmentNames','improvement']}},
},required:['strengths','development','questions','suggestedActions','context','level','levelReason','levelEvidence','criteria']};

export function normalizeFeedback(value:unknown,content:Content,rubric:Criterion[],suppliedAttachments:string[],language:Language):Feedback {
 validateRubric(rubric);
 if(!value||typeof value!=='object')throw new Error('AI không trả về phản hồi hợp lệ. Hãy thử lại.');
 const data=value as Feedback;
 for(const key of ['strengths','development','questions','suggestedActions'] as const)if(!Array.isArray(data[key])||data[key].length>8||data[key].some(s=>typeof s!=='string'||s.length>1500))throw new Error('AI không trả về phản hồi hợp lệ. Hãy thử lại.');
 if(typeof data.context!=='string'||data.context.length>2000||!Array.isArray(data.criteria)||data.criteria.length!==4)throw new Error('Kết quả AI không khớp rubric. Chưa lưu đánh giá.');
 const level=validateLevel(data.level);
 if(typeof data.levelReason!=='string'||!data.levelReason.trim()||data.levelReason.length>1500||typeof data.levelEvidence!=='string'||!data.levelEvidence.trim()||data.levelEvidence.length>1500||!sectionKeys.some(key=>content[key].includes(data.levelEvidence!)))throw new Error('Phân loại Kember cần lý do và minh chứng nguyên văn từ bài viết. Chưa lưu đánh giá.');
 const criteria=data.criteria.map((c,i)=>{
  const numeric=c?.score;
  if(!c||c.key!==criterionKeys[i]||(numeric!==null&&(typeof numeric!=='number'||!Number.isFinite(numeric)||numeric<0||numeric>10||Math.abs(numeric*10-Math.round(numeric*10))>1e-8))||!(c.level===null||Number.isInteger(c.level)&&c.level!>=1&&c.level!<=4)||typeof c.behavior!=='string'||c.behavior.length>1500||typeof c.evidence!=='string'||c.evidence.length>1500||typeof c.improvement!=='string'||c.improvement.length>1500||!Array.isArray(c.attachmentNames)||c.attachmentNames.length>3||c.attachmentNames.some(n=>typeof n!=='string'))throw new Error('Kết quả AI không khớp rubric. Chưa lưu đánh giá.');
  if(numeric!==null&&c.level!==null&&c.level!==criterionLevel(numeric))throw new Error('Điểm AI không nằm trong khoảng Level. Chưa lưu đánh giá.');
  const evidenceSection=c.evidence.trim()?sectionKeys.find(k=>content[k].includes(c.evidence))||null:null;
  const attachmentNames=c.key==='evidenceContext'?[...new Set(c.attachmentNames.filter(n=>suppliedAttachments.includes(n)))]:[];
  const valid=!!(evidenceSection||attachmentNames.length)&&numeric!==null&&c.level!==null;
  return {...c,evidence:evidenceSection?c.evidence:'',evidenceSection,attachmentNames,score:valid?numeric:null,level:valid?c.level:null,reviewRequired:!valid,behavior:valid?c.behavior:translate('Chưa đủ minh chứng. Cần giảng viên xem xét trước khi xác định điểm.',language)};
 });
 const reviewRequired=criteria.some(c=>c.reviewRequired),total=reviewRequired?null:totalScore(criteria.map(c=>c.score!),rubric);
 return {...data,criteria,scoreScale:10,reviewRequired,language,level,levelReason:data.levelReason.trim(),total,weightedScore:total,rubricSpecification,levelMethod:'ai-classification'};
}
