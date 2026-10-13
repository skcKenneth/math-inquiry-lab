import {clampFinite,ols,leverage,BASE_POINTS,fmt} from './math.mjs';
import {$,$$,bindPair,setPair,initLevel,initShell,initNotebook,plotFrame,esc,say} from './ui.mjs?v=math-system-2';
const params=new URL(location.href).searchParams;
const state={rx:Math.round(clampFinite(params.get('rx'),4.5,0,12)*4)/4,ry:Math.round(clampFinite(params.get('ry'),6,0,16)*4)/4,included:params.get('included')!=='false'};
const baseline=ols(BASE_POINTS);let fit=baseline,frame,dragPointer=null;
const svg=$('#plot');
function render(){
  setPair('rx',state.rx);setPair('ry',state.ry);$('#include-point').checked=state.included;
  const points=state.included?[...BASE_POINTS,[state.rx,state.ry]]:BASE_POINTS;
  fit=ols(points);
  const sign=fit.intercept<0?'−':'+';
  $('#equation').textContent=`y = ${fmt(fit.slope,3)}x ${sign} ${fmt(Math.abs(fit.intercept),3)}`;
  frame=plotFrame(svg,{xMin:0,xMax:12,yMin:0,yMax:16,xStep:2,yStep:4,title:'觀測值與線性迴歸',description:`原有八點斜率 ${fmt(baseline.slope,3)}。移動點 (${state.rx},${state.ry}) ${state.included?'已':'未'}加入擬合；目前斜率 ${fmt(fit.slope,3)}，R 平方 ${fmt(fit.r2,3)}。滑桿和數值輸入提供拖曳的替代操作。`});
  let paths=frame.line([[0,baseline.intercept],[12,baseline.intercept+12*baseline.slope]],'reference');
  if($('#residuals').checked)points.forEach(([x,y])=>{paths+=frame.line([[x,y],[x,fit.intercept+fit.slope*x]],'residual');});
  paths+=frame.line([[0,fit.intercept],[12,fit.intercept+12*fit.slope]]);
  BASE_POINTS.forEach(([x,y])=>{paths+=frame.circle(x,y);});
  const X=frame.X(state.rx),Y=frame.Y(state.ry);
  paths+=`<path class="movable" d="M${X},${Y-8} L${X+8},${Y} L${X},${Y+8} L${X-8},${Y} Z" ${state.included?'':'style="fill:white;stroke:#315a49"'}/><circle class="hit-target" data-drag="point" cx="${X}" cy="${Y}" r="22"/>`;
  frame.commit(paths);
  $('#slope').textContent=fmt(fit.slope,3);$('#delta').textContent=fmt(fit.slope-baseline.slope,3);$('#r2').textContent=fmt(fit.r2,3);
  $('#fit-values').innerHTML=[['原有 8 點',baseline],['目前',fit]].map(([label,f])=>`<tr><td>${label}</td><td>${esc(fmt(f.slope,4))}</td><td>${esc(fmt(f.intercept,4))}</td><td>${esc(fmt(f.r2,4))}</td></tr>`).join('');
  $('#leverage').textContent=state.included?`移動點的槓桿值 hᵢ = ${fmt(leverage(fit,state.rx),4)}。它描述 x 位置的特殊程度，並非實際影響力的完整量度。`:'移動點未加入擬合；目前直線等於基準直線。';
}
initLevel();initShell(()=>({...state}));
['rx','ry'].forEach(id=>bindPair(id,v=>{state[id]=v;render();}));
$('#include-point').addEventListener('change',e=>{state.included=e.target.checked;render();});
$('#residuals').addEventListener('change',render);
$$('[data-preset]').forEach(b=>b.addEventListener('click',()=>{
  const [x,y]={middle:[4.5,14],low:[11,2],along:[11,13]}[b.dataset.preset];
  Object.assign(state,{rx:x,ry:y,included:true});render();say(`移動點設定為 (${x}, ${y})。`);
}));
$('#reset').addEventListener('click',()=>{Object.assign(state,{rx:4.5,ry:6,included:true});render();say('圖像已重設；筆記保留。');});
function move(e){
  const matrix=svg.getScreenCTM();if(!matrix)return;
  const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
  state.rx=Math.round(clampFinite((p.x-frame.L)/frame.iw*12,4.5,0,12)*4)/4;
  state.ry=Math.round(clampFinite(16-(p.y-frame.T)/frame.ih*16,6,0,16)*4)/4;render();
}
svg.addEventListener('pointerdown',e=>{if(e.target.dataset.drag!=='point'||dragPointer!==null||e.button!==0)return;e.preventDefault();dragPointer=e.pointerId;svg.setPointerCapture(e.pointerId);svg.classList.add('dragging');});
svg.addEventListener('pointermove',e=>{if(e.pointerId===dragPointer){e.preventDefault();move(e);}});
function end(e){if(e.pointerId!==dragPointer)return;dragPointer=null;svg.classList.remove('dragging');if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);}
svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);svg.addEventListener('lostpointercapture',end);
initNotebook('regression','一個點的影響',()=>({summary:`點 (${fmt(state.rx)}, ${fmt(state.ry)}) ${state.included?'加入':'不加入'}擬合`,detail:`斜率 ${fmt(fit.slope,4)}；截距 ${fmt(fit.intercept,4)}；R² ${fmt(fit.r2,4)}；Δb = ${fmt(fit.slope-baseline.slope,4)}`,settings:{...state},fit:{slope:fit.slope,intercept:fit.intercept,r2:fit.r2},points:state.included?[...BASE_POINTS,[state.rx,state.ry]]:BASE_POINTS}));
render();
