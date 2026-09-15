import { VERSION, fmt } from './math.mjs';
export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];
export const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function say(message) { $('#status').textContent=message; }
export function bindPair(id, callback) {
  const range=$(`#${id}`), number=$(`#${id}-number`);
  const update = (source,other) => {
    if(!source.checkValidity() || source.value.trim()==='') { source.setAttribute('aria-invalid','true'); return; }
    source.removeAttribute('aria-invalid'); other.value=source.value;
    callback(Number(source.value));
  };
  range.addEventListener('input',()=>update(range,number));
  number.addEventListener('input',()=>update(number,range));
}
export function setPair(id,n) { $(`#${id}`).value=n; $(`#${id}-number`).value=n; }
export function setLevel(level) {
  const chosen=['core','explore','challenge'].includes(level)?level:'core';
  $$('.level-button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.level===chosen)));
  $$('.task').forEach(t=>t.hidden=t.dataset.level!==chosen);
  document.body.dataset.level=chosen;
}
export function initLevel(onChange=()=>{}) {
  setLevel(new URL(location.href).searchParams.get('level'));
  $$('.level-button').forEach(b=>b.addEventListener('click',()=>{setLevel(b.dataset.level); onChange();}));
}
export function levelName() { return {core:'核心',explore:'深究',challenge:'挑戰'}[document.body.dataset.level] || '核心'; }
export function initShell(getState) {
  $('#focus-mode').addEventListener('click',e=>{
    const active=document.body.classList.toggle('focus-mode');
    e.currentTarget.setAttribute('aria-pressed',String(active));
    e.currentTarget.textContent=active?'離開投影模式':'投影模式';
  });
  $('#share').addEventListener('click',async()=>{
    const url=new URL(location.href); url.search='';url.hash='';
    Object.entries({...getState(),level:document.body.dataset.level}).forEach(([k,v])=>url.searchParams.set(k,String(v)));
    try { await navigator.clipboard.writeText(url.href);say('已複製設定連結；不包含預測、筆記或學生資料。'); }
    catch { $('#share-fallback').hidden=false;$('#share-url').value=url.href;$('#share-url').select();say('請手動複製設定連結。'); }
  });
}
export function download(name,text,type='text/plain;charset=utf-8') {
  const u=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');
  a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
}
/** Opt-in, lab-specific browser storage; never clear another application’s data. */
export function initNotebook(lab,title,getSnapshot) {
  const key=`math-inquiry-lab:v1:${lab}`, fields=['prediction','explanation','exit-answer'];
  let records=[];
  const box=$('#remember'), status=$('#storage-status');
  const collect=()=>({schema:1,version:VERSION,lab,title,level:levelName(),
    answers:Object.fromEntries(fields.map(id=>[id,$(`#${id}`).value])),records});
  const printMirror=()=>fields.forEach(id=>$(`[data-print="${id}"]`).textContent=$(`#${id}`).value || '（尚未填寫）');
  const persist=()=>{
    printMirror();
    if(!box.checked) return;
    try{localStorage.setItem(key,JSON.stringify({...collect(),consent:true}));status.textContent='已儲存在此瀏覽器；不會傳送筆記。';}
    catch{status.textContent='此瀏覽器未能儲存。請匯出筆記，避免遺失。';}
  };
  const render=()=>{
    $('#record-list').innerHTML=records.length?records.map((r,i)=>`<li><span class="record-number">${String(i+1).padStart(2,'0')}</span><div><strong>${esc(r.level)} · ${esc(r.summary)}</strong><p>${esc(r.detail)}</p></div><button type="button" class="text-button remove-record" data-index="${i}" aria-label="刪除紀錄 ${i+1}">移除</button></li>`).join(''):'<li class="empty-record">尚未記錄。比較兩個設定後，再解釋你的觀察。</li>';
    $('#record-count').textContent=`${records.length} / 8`;
    $$('.remove-record').forEach(b=>b.addEventListener('click',()=>{records.splice(Number(b.dataset.index),1);render();persist();}));
  };
  try {
    const stored=JSON.parse(localStorage.getItem(key)||'null');
    if(stored?.schema===1 && stored.lab===lab && stored.consent===true) {
      box.checked=true;
      fields.forEach(id=>{if(typeof stored.answers?.[id]==='string')$(`#${id}`).value=stored.answers[id].slice(0,4000);});
      if(Array.isArray(stored.records))records=stored.records.filter(r=>r&&typeof r.summary==='string'&&typeof r.detail==='string'&&typeof r.level==='string').slice(0,8);
      status.textContent='已還原此瀏覽器的筆記；圖像仍使用目前設定。';
    }
  } catch {status.textContent='未能讀取本機筆記；仍可正常操作及匯出。';}
  fields.forEach(id=>$(`#${id}`).addEventListener('input',persist));
  box.addEventListener('change',()=>{
    if(box.checked)persist();else{try{localStorage.removeItem(key);status.textContent='已移除此活動的本機副本；本頁筆記仍保留。';}catch{status.textContent='未能移除儲存副本，請檢查瀏覽器設定。';}}
  });
  $('#record').addEventListener('click',()=>{
    if(records.length>=8){say('最多保留 8 筆。請先匯出或移除一筆紀錄。');return;}
    const snap=getSnapshot(); if(!snap){say('請先完成至少一次操作，再記錄。');return;}
    records.push({level:levelName(),...snap});render();persist();say(`已加入第 ${records.length} 筆紀錄。`);
  });
  $('#export-json').addEventListener('click',()=>download(`${lab}-learning-record.json`,JSON.stringify({...collect(),current:getSnapshot()},null,2),'application/json;charset=utf-8'));
  $('#export-text').addEventListener('click',()=>{
    const d=collect();const text=[`# ${title}`,`版本 ${VERSION} · 本機學習紀錄（並非已提交作業）`,'',
      '## 預測',d.answers.prediction||'（未填）','', '## 觀察紀錄',
      ...records.map((r,i)=>`${i+1}. [${r.level}] ${r.summary}\n   ${r.detail}`),'',
      '## 解釋與修正',d.answers.explanation||'（未填）','', '## 離堂題',$('#exit-question').textContent,d.answers['exit-answer']||'（未填）',
      '', '此紀錄由學生自行編寫；不代表已通過教師評核。'].join('\n');download(`${lab}-learning-record.txt`,text);
  });
  $('#print').addEventListener('click',()=>{printMirror();window.print();});
  $('#clear-notes').addEventListener('click',()=>{
    if(!confirm('清除本活動的預測、紀錄與解釋？此操作不影響其他活動。'))return;
    fields.forEach(id=>$(`#${id}`).value='');records=[];box.checked=false;
    try{localStorage.removeItem(key);status.textContent='已清除本活動筆記。';}catch{status.textContent='本頁已清除，但無法移除瀏覽器儲存副本。';}
    render();printMirror();say('已清除本活動筆記；圖像設定不變。');
  });
  render();printMirror();return {persist};
}
/** Fixed, responsive SVG plotting area; accessible description is rebuilt with each view. */
export function plotFrame(svg,{xMin,xMax,yMin,yMax,xStep=2,yStep=2,title,description,xLabel='x',yLabel='y'}) {
  const W=720,H=480,L=56,R=24,T=24,B=56,iw=W-L-R,ih=H-T-B;
  const X=x=>L+(x-xMin)/(xMax-xMin)*iw,Y=y=>T+(yMax-y)/(yMax-yMin)*ih;
  const id=svg.id+'-clip';
  let body=`<title>${esc(title)}</title><desc>${esc(description)}</desc><defs><clipPath id="${id}"><rect x="${L}" y="${T}" width="${iw}" height="${ih}"/></clipPath></defs>`;
  for(let x=Math.ceil(xMin/xStep)*xStep;x<=xMax+1e-8;x+=xStep)body+=`<line class="grid-line" x1="${X(x)}" x2="${X(x)}" y1="${T}" y2="${H-B}"/><text class="tick" x="${X(x)}" y="${H-B+24}" text-anchor="middle">${esc(fmt(x))}</text>`;
  for(let y=Math.ceil(yMin/yStep)*yStep;y<=yMax+1e-8;y+=yStep)body+=`<line class="grid-line" x1="${L}" x2="${W-R}" y1="${Y(y)}" y2="${Y(y)}"/><text class="tick" x="${L-12}" y="${Y(y)+5}" text-anchor="end">${esc(fmt(y))}</text>`;
  if(xMin<=0&&xMax>=0)body+=`<line class="axis-line" x1="${X(0)}" x2="${X(0)}" y1="${T}" y2="${H-B}"/>`;
  if(yMin<=0&&yMax>=0)body+=`<line class="axis-line" x1="${L}" x2="${W-R}" y1="${Y(0)}" y2="${Y(0)}"/>`;
  body+=`<text class="axis-label" x="${W-R}" y="${H-8}" text-anchor="end">${esc(xLabel)}</text><text class="axis-label" x="${L}" y="16">${esc(yLabel)}</text>`;
  const line=(pts,cls='curve',extra='')=>`<path class="${cls}" d="${pts.filter(p=>p.every(Number.isFinite)).map(([x,y],i)=>`${i?'L':'M'}${X(x).toFixed(2)},${Y(y).toFixed(2)}`).join(' ')}" clip-path="url(#${id})" ${extra}/>`;
  const circle=(x,y,cls='point',r=5)=>`<circle class="${cls}" cx="${X(x)}" cy="${Y(y)}" r="${r}" clip-path="url(#${id})"/>`;
  const commit=extra=>{svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.innerHTML=body+extra;};
  return {X,Y,line,circle,commit,L,T,iw,ih,W,H};
}
export function sampleCurve(f,min,max,n=500) {return Array.from({length:n+1},(_,i)=>{const x=min+(max-min)*i/n;return[x,f(x)];});}
