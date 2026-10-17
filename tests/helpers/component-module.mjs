import fs from 'node:fs';
import ts from 'typescript';

// Render the real message UI. The compact footer uses native anchors; its unused
// framework Link import has no Next router in this Node-only regression test.
const modules=new Map();
export function componentModule(url){
  if(modules.has(url.href))return modules.get(url.href);
  const result=ts.transpileModule(fs.readFileSync(url,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
  const output=result.outputText.replace(/from ["']([^"']+)["']/g,(match,specifier)=>{
    let resolved;
    if(specifier==='next/link')resolved='data:text/javascript,export default function UnusedLink(){throw new Error("Router Link is outside this test")}';
    else if(specifier.startsWith('.')){
      const relative=new URL(specifier,url);
      const target=fs.existsSync(relative)?relative:fs.existsSync(new URL(relative.href+'.tsx'))?new URL(relative.href+'.tsx'):new URL(relative.href+'.ts');
      resolved=target.pathname.endsWith('.tsx')?componentModule(target):target.href;
    }else resolved=import.meta.resolve(specifier);
    return `from ${JSON.stringify(resolved)}`;
  });
  const moduleUrl='data:text/javascript;base64,'+Buffer.from(output).toString('base64');modules.set(url.href,moduleUrl);return moduleUrl;
}
