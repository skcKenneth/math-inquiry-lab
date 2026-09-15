/** Local preview only. Serves site/, never development files or the parent directory. */
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../site/',import.meta.url));
const port=Number(process.env.PORT||4173);
const types={'.html':'text/html;charset=utf-8','.css':'text/css;charset=utf-8','.mjs':'text/javascript;charset=utf-8','.js':'text/javascript;charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json;charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  try{
    let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname==='/math-inquiry-lab') {res.writeHead(302,{Location:'/math-inquiry-lab/'});res.end();return;}
    if(pathname.startsWith('/math-inquiry-lab/'))pathname=pathname.slice('/math-inquiry-lab'.length);
    let target=path.resolve(root,'.'+pathname);
    if(target!==root.slice(0,-1)&&!target.startsWith(root)){res.writeHead(403);res.end('Forbidden');return;}
    if((await stat(target)).isDirectory())target=path.join(target,'index.html');
    const bytes=await readFile(target);
    res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(bytes);
  }catch{res.writeHead(404,{'Content-Type':'text/plain;charset=utf-8'});res.end('Not found');}
});
server.on('error',err=>{console.error(err.message);process.exit(1);});
server.listen(port,'127.0.0.1',()=>console.log(`Math Inquiry Lab: http://127.0.0.1:${port}/math-inquiry-lab/`));
