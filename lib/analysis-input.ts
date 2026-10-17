import type { Content, Criterion } from './domain';

type EvidenceFile={object_key:string;type:string;name:string};
function base64(bytes: Uint8Array) {
  let value='';for(let i=0;i<bytes.length;i+=8192)value+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(value);
}
export async function analysisInput(title: string,content: Content,rubric: Criterion[],files: EvidenceFile[],includeAttachments: boolean,read: (key:string)=>Promise<ArrayBuffer|null>) {
  const input:Record<string,unknown>[]=[{type:'input_text',text:JSON.stringify({title,content,rubric})}];
  if(!includeAttachments)return input;
  for(const file of files.slice(0,3)) {
    const data=await read(file.object_key);if(!data)continue;
    const bytes=new Uint8Array(data);
    if(file.type.startsWith('image/'))input.push({type:'input_text',text:`Attached evidence image: ${file.name}`},{type:'input_image',image_url:`data:${file.type};base64,${base64(bytes)}`,detail:'auto'});
    else if(file.type==='application/pdf')input.push({type:'input_file',filename:file.name,file_data:`data:application/pdf;base64,${base64(bytes)}`});
    else input.push({type:'input_text',text:`Attached evidence ${file.name}:\n${new TextDecoder().decode(bytes).slice(0,20000)}`});
  }
  return input;
}
