import {clampFinite,bernoulli,fmt} from './math.mjs';
import {$,$$,bindPair,setPair,initLevel,initShell,initNotebook,plotFrame,esc,say} from './ui.mjs?v=math-system-2';
const params=new URL(location.href).searchParams;
const state={p:Math.round(clampFinite(params.get('p'),.5,0,1)*20)/20,seed:Math.round(clampFinite(params.get('seed'),2026,0,999999)),n:Math.floor(clampFinite(params.get('n'),0,0,20000)),paths:Math.floor(clampFinite(params.get('paths'),1,1,4))};
let results=[];
function render(){
  setPair('p',state.p);$('#seed').value=state.seed;$('#seed').removeAttribute('aria-invalid');
  results=Array.from({length:state.paths},(_,i)=>bernoulli(state.p,state.n,(state.seed+Math.imul(i,2654435761))>>>0));
  const r=results[0],extent=Math.max(10,state.n);
  const step=extent<=10?2:extent<=100?20:extent<=1000?200:extent<=10000?2000:5000;
  const f=plotFrame($('#plot'),{xMin:0,xMax:extent,yMin:0,yMax:1,xStep:step,yStep:.2,title:'正面相對頻率',description:`${state.paths} 條序列，各 ${state.n} 次試驗；理論概率 ${state.p}。第一條正面次數 ${r.heads}，相對頻率 ${fmt(r.proportion,4)}。`,xLabel:'試驗次數 n',yLabel:'相對頻率'});
  let paths=f.line([[0,state.p],[extent,state.p]],'reference');
  results.forEach((result,i)=>{
    const stride=Math.max(1,Math.ceil(result.path.length/800));
    const pts=result.path.filter((_,j)=>j%stride===0||j===result.path.length-1);
    if(pts.length)paths+=f.line(pts,`curve ${i?`run-${i+1}`:''}`)+f.circle(state.n,result.proportion,'vertex',4);
  });
  f.commit(paths);
  $('#paths-label').textContent=`${state.paths} 條序列`;
  $('#trials').textContent=state.n.toLocaleString('en-US');
  $('#proportion').textContent=fmt(r.proportion,4);
  $('#error').textContent=r.proportion===null?'—':fmt(Math.abs(r.proportion-state.p),4);
  $('#path-values').innerHTML=results.map((r,i)=>`<tr><td>${i+1}</td><td>${r.heads}</td><td>${esc(fmt(r.proportion,4))}</td><td>${esc(fmt(r.heads-state.n*state.p,2))}</td></tr>`).join('');
  $('#add-path').disabled=state.paths>=4;$$('[data-add]').forEach(b=>b.disabled=state.n>=20000);
}
initLevel();initShell(()=>({...state}));
bindPair('p',v=>{state.p=v;state.n=0;render();say('概率已改變，試驗已重設；筆記保留。');});
$('#seed').addEventListener('change',e=>{
  if(!e.target.checkValidity()||e.target.value===''){e.target.setAttribute('aria-invalid','true');return;}
  e.target.removeAttribute('aria-invalid');state.seed=Number(e.target.value);state.n=0;render();say('重現代碼已改變，試驗已重設；筆記保留。');
});
$$('[data-add]').forEach(b=>b.addEventListener('click',()=>{state.n=Math.min(20000,state.n+Number(b.dataset.add));render();say(`每條序列已完成 ${state.n} 次試驗。`);}));
$('#add-path').addEventListener('click',()=>{state.paths=Math.min(4,state.paths+1);render();say(`已顯示 ${state.paths} 條不同序列。`);});
$('#new-seed').addEventListener('click',()=>{state.seed=(state.seed+1)%1000000;state.n=0;render();say('已另起一組，seed 加 1；筆記保留。');});
$('#reset').addEventListener('click',()=>{state.n=0;state.paths=1;render();say('已重設試驗，保留 p、seed 及筆記。');});
initNotebook('probability','概率與相對頻率',()=>state.n?{summary:`p = ${fmt(state.p)}；n = ${state.n}；seed = ${state.seed}`,detail:results.map((r,i)=>`序列 ${i+1}：${r.heads} 次正面；頻率 ${fmt(r.proportion,4)}`).join(' / '),settings:{...state},results:results.map(({n,heads,proportion})=>({n,heads,proportion}))}:null);
render();
