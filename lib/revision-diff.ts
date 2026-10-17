export type Difference={kind:'same'|'added'|'removed';text:string};
/** Bounded LCS keeps long submissions from allocating an unbounded matrix. */
export function diffText(before:string,after:string):Difference[]{
 const a=before.split(/(\s+)/).filter(Boolean),b=after.split(/(\s+)/).filter(Boolean),parts:Difference[]=[];
 const append=(kind:Difference['kind'],text:string)=>{if(!text)return;const prev=parts.at(-1);if(prev?.kind===kind)prev.text+=text;else parts.push({kind,text});};
 if(a.length*b.length>400000){let start=0;while(start<a.length&&start<b.length&&a[start]===b[start])start++;let end=0;while(end<a.length-start&&end<b.length-start&&a[a.length-1-end]===b[b.length-1-end])end++;append('same',a.slice(0,start).join(''));append('removed',a.slice(start,a.length-end).join(''));append('added',b.slice(start,b.length-end).join(''));append('same',end?a.slice(a.length-end).join(''):'');return parts;}
 const width=b.length+1,table=new Uint32Array((a.length+1)*width);
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)table[i*width+j]=a[i]===b[j]?1+table[(i+1)*width+j+1]:Math.max(table[(i+1)*width+j],table[i*width+j+1]);
 let i=0,j=0;while(i<a.length||j<b.length){if(i<a.length&&j<b.length&&a[i]===b[j]){append('same',a[i]);i++;j++;}else if(j<b.length&&(i===a.length||table[i*width+j+1]>=table[(i+1)*width+j]))append('added',b[j++]);else append('removed',a[i++]);}return parts;
}
