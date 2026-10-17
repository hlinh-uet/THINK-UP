import {criterionKeys,sectionKeys,validateScores,type AssessmentCriterion,type Content,type Criterion,type Review} from './domain.ts';

export const levelRanges = [[0,2.5],[2.6,5],[5.1,7.5],[7.6,10]] as const;
export function criterionLevel(score:number):number {return score<=2.5?1:score<=5?2:score<=7.5?3:4;}
export function scoreOnTen(score:number,scale:4|10=4){return score/scale*10;}
export function reviewScoresOnTen(review:Review){return review.scores.map(s=>scoreOnTen(s,review.scoreScale));}
export function rubricVersion(rubric:Criterion[]){
 let hash=2166136261;for(const c of JSON.stringify(rubric))hash=Math.imul(hash^c.charCodeAt(0),16777619);
 return `final-v3-${(hash>>>0).toString(16)}`;
}
export function blankAssessment(rubric:Criterion[]):AssessmentCriterion[]{return rubric.map(c=>({key:c.key,level:null,score:null,evidence:'',reason:'',improvement:'',attachmentNames:[],missingReason:''}));}
export function validateAssessment(value:unknown,content:Content,rubric:Criterion[],attachments:string[]):AssessmentCriterion[]{
 if(!Array.isArray(value)||value.length!==4)throw new Error('Cần đủ bốn tiêu chí, Level, điểm và căn cứ đánh giá.');
 return value.map((raw,i)=>{
  const c=raw as AssessmentCriterion;
  if(!c||c.key!==criterionKeys[i]||c.key!==rubric[i].key)throw new Error('Tiêu chí đánh giá không khớp rubric.');
  validateScores([c.score,c.score,c.score,c.score]);
  if(c.level!==criterionLevel(c.score!))throw new Error('Điểm cần nằm trong khoảng Level đã chọn.');
  for(const key of ['evidence','reason','improvement','missingReason'] as const)if(c[key]!==undefined&&(typeof c[key]!=='string'||c[key]!.length>3000))throw new Error('Căn cứ hoặc nhận xét tiêu chí chưa hợp lệ.');
  if(!c.reason?.trim()||!c.improvement?.trim())throw new Error('Mỗi tiêu chí cần giải thích và hướng cải thiện.');
  const names=Array.isArray(c.attachmentNames)?c.attachmentNames:[];
  if(names.length>3||names.some(n=>typeof n!=='string'||!attachments.includes(n))||(i!==1&&names.length))throw new Error('Minh chứng đính kèm không thuộc bài viết.');
  const quote=c.evidence?.trim()||'';
  if(quote&&!sectionKeys.some(k=>content[k].includes(quote)))throw new Error('Minh chứng cần là trích đoạn nguyên văn trong bài.');
  if(!quote&&!names.length&&!(c.level===1&&(c.missingReason?.trim().length||0)>=10))throw new Error('Hãy chọn minh chứng hoặc xác nhận rõ thành phần còn thiếu ở Level 1.');
  return {...c,score:c.score!,evidence:quote,reason:c.reason.trim(),improvement:c.improvement.trim(),attachmentNames:names,missingReason:c.missingReason?.trim()||''};
 });
}
