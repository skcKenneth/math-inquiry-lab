import {clampFinite, quadratic, quadraticFacts, fmt} from './math.mjs';
import {$,bindPair,setPair,initLevel,initShell,initNotebook,plotFrame,sampleCurve,esc,say} from './ui.mjs?v=math-system-2';
const params=new URL(location.href).searchParams;
const quant=(key,fallback,min,max,step)=>Math.round(clampFinite(params.get(key),fallback,min,max)/step)*step;
const state={a:quant('a',1,-3,3,.25),h:quant('h',0,-4,4,.5),k:quant('k',0,-4,4,.5)};
function equation(){
  const {a,h,k}=state,inside=h===0?'x':`(x ${h<0?'+':'−'} ${fmt(Math.abs(h))})`;
  if(a===0)return `y = ${fmt(k)}`;
  return `y = ${a===1?'':a===-1?'−':fmt(a)}${inside}²${k===0?'':` ${k<0?'−':'+'} ${fmt(Math.abs(k))}`}`;
}
function render(){
  const {a,h,k}=state;['a','h','k'].forEach(key=>setPair(key,state[key]));
  const facts=quadraticFacts(a,h,k),vertex=facts.vertex;
  $('#equation').textContent=equation();$('#degenerate').hidden=a!==0;
  const hint=vertex?($('#show-vertex').checked?`頂點為 (${h},${k})，對稱軸 x = ${h}。`:'頂點與對稱軸提示已隱藏，可勾選顯示。'):'a 為 0，是常數函數，沒有唯一頂點。';
  const f=plotFrame($('#plot'),{xMin:-8,xMax:8,yMin:-5,yMax:5,xStep:2,yStep:1,title:equation(),description:`固定刻度的函數圖像。${hint}可用數值核對表閱讀座標。`});
  let paths='';
  if($('#show-reference').checked)paths+=f.line(sampleCurve(x=>x*x,-8,8),'reference');
  $('#reference-legend').hidden=!$('#show-reference').checked;
  paths+=f.line(sampleCurve(x=>quadratic(a,h,k,x),-8,8));
  if($('#show-vertex').checked&&vertex){paths+=f.line([[h,-5],[h,5]],'guide')+f.circle(h,k,'vertex',6);}
  f.commit(paths);
  const roots=facts.roots==='all'?'所有實數都是零點':facts.roots.length?facts.roots.map(n=>fmt(n,3)).join('、'):'沒有實數零點';
  $('#facts').textContent=vertex?`頂點 (${fmt(h)}, ${fmt(k)})；對稱軸 x = ${fmt(h)}；${a>0?'向上':'向下'}開口。零點：${roots}。`:`常數函數：${roots}。沒有唯一頂點。`;
  $('#sample-values').innerHTML=[h-1,h,h+1].map(x=>`<tr><td>${esc(fmt(x))}</td><td>${esc(fmt(quadratic(a,h,k,x)))}</td></tr>`).join('');
}
initLevel();initShell(()=>({...state}));
['a','h','k'].forEach(key=>bindPair(key,v=>{state[key]=v;render();}));
['show-reference','show-vertex'].forEach(id=>$(`#${id}`).addEventListener('change',render));
$('#reset').addEventListener('click',()=>{Object.assign(state,{a:1,h:0,k:0});render();say('圖像已重設；筆記保留。');});
initNotebook('quadratic','二次函數',()=>({summary:equation(),detail:[state.h-1,state.h,state.h+1].map(x=>`(${fmt(x)}, ${fmt(quadratic(state.a,state.h,state.k,x))})`).join('；'),settings:{...state},facts:quadraticFacts(state.a,state.h,state.k)}));
render();
