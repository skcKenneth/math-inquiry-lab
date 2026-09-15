/** Verify a running localhost/project URL or an actually deployed Pages URL. */
const raw=process.argv[2]||'http://127.0.0.1:4173/math-inquiry-lab/';
const base=new URL(raw.endsWith('/')?raw:raw+'/');
const routes=['index.html','teacher-guide.html','about.html','labs/quadratic.html','labs/probability.html','labs/regression.html','assets/site.css','assets/math.mjs','assets/ui.mjs','assets/quadratic.mjs','assets/probability.mjs','assets/regression.mjs','assets/favicon.svg'];
let failed=false;
for(const route of routes){
  const url=new URL(route,base);
  try{
    const res=await fetch(url,{signal:AbortSignal.timeout(15000)});
    const text=await res.text();
    const type=res.headers.get('content-type')||'';
    const valid=res.ok && text.length>0 && (route.endsWith('.html')?text.includes('Math Inquiry Lab'):route.endsWith('.mjs')?/javascript/.test(type):true);
    console.log(`${valid?'PASS':'FAIL'} ${res.status} ${url.href} [${type}]`);
    if(!valid)failed=true;
  }catch(e){console.error(`FAIL ${url.href}: ${e.message}`);failed=true;}
}
if(failed)process.exit(1);
