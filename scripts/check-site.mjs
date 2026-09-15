import {readdir,readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../site/',import.meta.url));
async function walk(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);out.push(...(e.isDirectory()?await walk(p):[p]));}return out;}
const files=await walk(root);let checked=0;const failures=[];
for(const file of files.filter(f=>f.endsWith('.html'))){
  const html=await readFile(file,'utf8');
  if(!html.includes('lang="zh-Hant"'))failures.push(`${file}: missing zh-Hant`);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  if(new Set(ids).size!==ids.length)failures.push(`${file}: duplicate ids`);
  for(const m of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
    const u=m[1];if(/^(https?:|mailto:|data:)/.test(u))continue;
    if(u.startsWith('/'))failures.push(`${file}: root-absolute path ${u}`);
    const [base,hash]=u.split('#');const target=base?path.resolve(path.dirname(file),base.split('?')[0]):file;
    try{await stat(target);checked++;if(hash&&target.endsWith('.html')){const text=await readFile(target,'utf8');if(!text.includes(`id="${hash}"`))failures.push(`${file}: missing anchor ${u}`);}}
    catch{failures.push(`${file}: missing target ${u}`);}
  }
  if(/<(?:script|link)[^>]+(?:src|href)="https?:/i.test(html))failures.push(`${file}: external runtime dependency`);
}
const size=(await Promise.all(files.map(async f=>(await stat(f)).size))).reduce((a,b)=>a+b,0);
if(size>500_000)failures.push(`Production exceeds 500KB: ${size}`);
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log(`PASS: ${files.filter(f=>f.endsWith('.html')).length} HTML pages, ${checked} local links/anchors, ${(size/1024).toFixed(1)} KiB production assets; no external runtime assets.`);
