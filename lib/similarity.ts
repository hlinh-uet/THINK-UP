import { sectionKeys, type Content, type SectionKey } from './domain.ts';

export type SimilarityDocument = {
  id: string; userId: string; courseId: string; versionId: string;
  title: string; studentName: string; studentEmail: string; courseName: string;
  content: Content;
};
export type SimilaritySource = Omit<SimilarityDocument, 'content'>;
export type SimilarityMatch = {
  left: SimilaritySource; right: SimilaritySource;
  coverageLeft: number; coverageRight: number; sharedShingles: number;
  excerpts: {left: {section: SectionKey; text: string}; right: {section: SectionKey; text: string}}[];
};
export type SimilarityReport = {
  checkedAt: string; courseIds: string[]; reflectionId: string | null;
  documents: number; eligible: number; skipped: number; comparedPairs: number;
  matches: SimilarityMatch[]; matchedPairs: number; versions: {id:string;versionId:string}[];
};

const windowSize = 5;
const minimumWords = 40;
type Token = {value: string; start: number; end: number};
type Position = {section: SectionKey; index: number};
type Indexed = {
  doc: SimilarityDocument; sections: Record<SectionKey, Token[]>;
  shingles: Map<string, Position[]>; words: number;
};
function tokens(text: string): Token[] {
  return [...text.matchAll(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu)].map(match => ({
    value: match[0].normalize('NFKC').toLowerCase(), start: match.index!, end: match.index! + match[0].length,
  }));
}
function key(words: Token[], start: number) { return words.slice(start,start+windowSize).map(t=>t.value).join(' '); }
function indexDocument(doc: SimilarityDocument, ignored: Set<string>): Indexed {
  const sections = Object.fromEntries(sectionKeys.map(s=>[s,tokens(doc.content[s])])) as Record<SectionKey,Token[]>;
  const shingles = new Map<string,Position[]>();
  for (const section of sectionKeys) {
    const words = sections[section];
    for (let index=0;index<=words.length-windowSize;index++) {
      const value=key(words,index);
      if(ignored.has(value))continue;
      const positions=shingles.get(value)||[];
      positions.push({section,index});shingles.set(value,positions);
    }
  }
  return {doc,sections,shingles,words:sectionKeys.reduce((n,s)=>n+sections[s].length,0)};
}
function source(doc: SimilarityDocument): SimilaritySource {
  return {id:doc.id,userId:doc.userId,courseId:doc.courseId,versionId:doc.versionId,title:doc.title,studentName:doc.studentName,studentEmail:doc.studentEmail,courseName:doc.courseName};
}
function overlap(index: Indexed, shared: string[]): number {
  // Count each covered token once, even when several five-word windows overlap.
  const covered=new Set<string>();
  for(const value of shared)for(const p of index.shingles.get(value)||[]) {
    for(let i=p.index;i<p.index+windowSize;i++)covered.add(`${p.section}:${i}`);
  }
  return Math.round(covered.size/index.words*1000)/10;
}
function excerpts(left: Indexed,right: Indexed,shared: string[]): SimilarityMatch['excerpts'] {
  const result:SimilarityMatch['excerpts']=[],covered=new Set<string>();
  for(const value of shared)for(const a of left.shingles.get(value)||[]) {
    if(covered.has(`${a.section}:${a.index}`))continue;
    const b=right.shingles.get(value)![0],at=left.sections[a.section],bt=right.sections[b.section];
    let length=windowSize;
    while(length<80&&at[a.index+length]&&bt[b.index+length]&&at[a.index+length].value===bt[b.index+length].value)length++;
    for(let i=a.index;i<a.index+length;i++)covered.add(`${a.section}:${i}`);
    const extract=(idx:Indexed,p:Position)=>idx.doc.content[p.section].slice(idx.sections[p.section][p.index].start,idx.sections[p.section][p.index+length-1].end);
    result.push({left:{section:a.section,text:extract(left,a)},right:{section:b.section,text:extract(right,b)}});
    if(result.length===3)return result;
  }
  return result;
}

/** Text overlap is a review signal. It never changes a grade or establishes plagiarism. */
export function compareSubmissions(documents: SimilarityDocument[], ignoredTexts: string[] = [], reflectionId?: string) {
  const ignored=new Set<string>();
  for(const text of ignoredTexts){const words=tokens(text);for(let i=0;i<=words.length-windowSize;i++)ignored.add(key(words,i));}
  const indexed=documents.map(d=>indexDocument(d,ignored));
  if(indexed.reduce((n,d)=>n+d.words,0)>200000)throw new Error('Chọn một học phần nhỏ hơn để kiểm tra trùng lặp.');
  const eligible=indexed.filter(d=>d.words>=minimumWords&&d.shingles.size>0);
  const postings=new Map<string,number[]>();
  eligible.forEach((d,i)=>{for(const value of d.shingles.keys()){const list=postings.get(value)||[];list.push(i);postings.set(value,list);}});
  const candidates=new Set<string>();
  for(const list of postings.values())for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++) {
    const a=list[i],b=list[j],left=eligible[a],right=eligible[b];
    if(left.doc.userId===right.doc.userId)continue;
    if(reflectionId&&left.doc.id!==reflectionId&&right.doc.id!==reflectionId)continue;
    candidates.add(`${a}:${b}`);
  }
  let matches:SimilarityMatch[]=[];let matchedPairs=0;
  const byCoverage=(a:SimilarityMatch,b:SimilarityMatch)=>Math.max(b.coverageLeft,b.coverageRight)-Math.max(a.coverageLeft,a.coverageRight)||a.left.id.localeCompare(b.left.id);
  for(const pair of candidates){
    const [a,b]=pair.split(':').map(Number),left=eligible[a],right=eligible[b];
    const shared=[...left.shingles.keys()].filter(value=>right.shingles.has(value));
    if(shared.length<8)continue;
    const coverageLeft=overlap(left,shared),coverageRight=overlap(right,shared);
    if(Math.max(coverageLeft,coverageRight)<10)continue;
    matches.push({left:source(left.doc),right:source(right.doc),coverageLeft,coverageRight,sharedShingles:shared.length,excerpts:excerpts(left,right,shared)});
    matchedPairs++;
    if(matches.length>=400)matches=matches.sort(byCoverage).slice(0,200);
  }
  matches=matches.sort(byCoverage).slice(0,200);
  const authorCounts=new Map<string,number>();
  for(const d of eligible)authorCounts.set(d.doc.userId,(authorCounts.get(d.doc.userId)||0)+1);
  const target=reflectionId?eligible.find(d=>d.doc.id===reflectionId):null;
  const comparedPairs=reflectionId?(target?eligible.length-(authorCounts.get(target.doc.userId)||0):0):eligible.length*(eligible.length-1)/2-[...authorCounts.values()].reduce((n,c)=>n+c*(c-1)/2,0);
  return {documents:documents.length,eligible:eligible.length,skipped:documents.length-eligible.length,comparedPairs,matches,matchedPairs,versions:documents.map(d=>({id:d.id,versionId:d.versionId}))};
}
