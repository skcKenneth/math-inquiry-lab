import { VERSION, fmt } from './math.mjs';
import {language,t} from './i18n.mjs';
export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];
export const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function say(message) { $('#status').textContent=t(message); }
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
export function setPair(id,n) {
  [$(`#${id}`),$(`#${id}-number`)].forEach(input=>{
    // Preserve a number input's edit buffer (for example, a just-typed "0.").
    if(input.value.trim()===''||Number(input.value)!==n)input.value=n;
    input.removeAttribute('aria-invalid');
  });
}
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
export function levelName() { return t({core:'核心',explore:'深究',challenge:'挑戰'}[document.body.dataset.level] || '核心'); }
export function initShell(getState) {
  $('#focus-mode').addEventListener('click',e=>{
    const active=document.body.classList.toggle('focus-mode');
    e.currentTarget.setAttribute('aria-pressed',String(active));
    e.currentTarget.textContent=active?'離開投影模式':'投影模式';
  });
  $('#share').addEventListener('click',async()=>{
    const url=new URL(location.href); url.search='';url.hash='';
    Object.entries({...getState(),level:document.body.dataset.level}).forEach(([k,v])=>url.searchParams.set(k,String(v)));
    if(language==='en')url.searchParams.set('lang','en');
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
  const rawSnapshot=getSnapshot;getSnapshot=()=>{const value=rawSnapshot();return value?{...value,summary:t(value.summary),detail:t(value.detail)}:value;};
  const key=`math-inquiry-lab:v1:${lab}`, fields=['prediction','explanation','exit-answer'];
  let records=[],store=null,unsubscribe=null,saving=false,recordOperations=[];
  const dirtyFields=new Set(),composingFields=new Set(),fieldBaselines=Object.fromEntries(fields.map(id=>[id,'']));
  const eventId=()=>globalThis.crypto?.randomUUID?.()||'lab-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  const identified=row=>typeof row?.eventId==='string'&&row.eventId.length>0;
  const readableRecords=value=>Array.isArray(value)?value.filter(r=>r&&typeof r.summary==='string'&&typeof r.detail==='string'&&typeof r.level==='string'):[];
  const box=$('#remember'), status=$('#storage-status');
  box.checked=false;
  const collect=()=>({schema:1,version:VERSION,lab,title,level:levelName(),
    answers:Object.fromEntries(fields.map(id=>[id,$(`#${id}`).value])),records});
  const printMirror=()=>fields.forEach(id=>$(`[data-print="${id}"]`).textContent=$(`#${id}`).value || t('（尚未填寫）'));
  try{store=globalThis.MathStorage?.createStore({namespace:'math-inquiry-'+lab,storage:localStorage,recovery:false,defaults:{[key]:{schema:1,version:VERSION,lab,title,level:'核心',answers:{prediction:'',explanation:'','exit-answer':''},records:[],consent:false}},decode(_key,raw){const value=JSON.parse(raw);if(!value||value.schema!==1||value.lab!==lab||value.consent!==true||!value.answers||!Array.isArray(value.records))throw Error('Unreadable notebook');return value;}});}catch{}
  function conflictPanel(){
    let panel=$('#notebook-conflicts');const variants=store?.conflicts()||[];
    if(!variants.length){panel?.remove();return;}
    if(!panel){panel=document.createElement('section');panel.id='notebook-conflicts';status.after(panel);}panel.replaceChildren();
    const heading=document.createElement('h3');heading.textContent=language==='en'?'Both notebook versions are retained':'兩份筆記版本已保留';panel.append(heading);
    for(const item of variants){const row=document.createElement('div'),pre=document.createElement('pre');pre.className='student-writing';pre.style.whiteSpace='pre-wrap';pre.textContent=JSON.stringify({field:item.path,local:item.local,otherTab:item.remote},null,2);row.append(pre);
      for(const choice of item.external?['resume']:['local','remote']){const b=document.createElement('button');b.type='button';b.textContent=choice==='resume'?(language==='en'?'Download both and reread':'下載兩份並重新讀取'):choice==='local'?(language==='en'?'Keep this version':'保留本版本'):(language==='en'?'Use other version':'採用另一版本');b.addEventListener('click',async()=>{if(choice==='resume'){download(lab+'-conflicts.json',JSON.stringify(store.exportRecovery(),null,2),'application/json');await store.resume();}else{if(item.path[0]==='answers')dirtyFields.delete(item.path[1]);await store.resolve(item.id,choice);}});row.append(b);}panel.append(row);
    }
  }
  const showState=result=>{status.textContent=result?.status==='conflict'?'兩個分頁的版本均已保留；匯出包含衝突內容。':result?.ok?'已儲存在此瀏覽器；不會傳送筆記。':'目前筆記仍保留；本機保存未完成，請匯出備份。';conflictPanel();};
  const persist=changedField=>{
    if(changedField)dirtyFields.add(changedField);
    printMirror();
    if(!box.checked) return;
    if(!store){showState({ok:false,status:'session-only'});return;}
    saving=true;store.setRecoveryEnabled(true);const current=store.snapshot()[key]||{};
    store.edit({key,path:[],kind:'seed',value:{schema:1,version:VERSION,lab,title,level:'核心',answers:{prediction:'',explanation:'','exit-answer':''},records:[],consent:false}});
    for(const id of dirtyFields)if(current.answers?.[id]!==$(`#${id}`).value)store.edit({key,path:['answers',id],kind:'set',base:fieldBaselines[id],defaultValue:'',value:$(`#${id}`).value});
    // First opt-in copies the current session's records. Later additions and
    // removals operate on individual events, preserving concurrent tab records.
    if(current.consent!==true){records=records.map(row=>identified(row)?row:{...row,eventId:eventId()});for(const row of records)store.edit({key,path:['records'],kind:'append',value:row});}
    else for(const operation of recordOperations)store.edit({key,path:['records'],...operation});
    recordOperations=[];
    if(current.consent!==true)store.edit({key,path:['consent'],kind:'set',base:current.consent??false,defaultValue:false,value:true});
    saving=false;void store.flush().then(showState);
  };
  async function removeRecoveryCopies(){
    // Revocation covers older writers of this lab too. The metadata stamp has
    // no learner text and remains to detect a stale, uncoordinated writer.
    return navigator.locks.request('math-learning:writer:v1',()=>{
      if(localStorage.getItem(key)!==null)return false;
      const prefix='math-learning-sync-v1:recovery:'+store.namespace+':';
      const selected=[];for(let i=0;i<localStorage.length;i++){const entry=localStorage.key(i);if(entry?.startsWith(prefix))selected.push(entry);}
      for(const entry of selected)localStorage.removeItem(entry);
      return true;
    });
  }
  const removeLocal=()=>{if(!store){status.textContent='本頁筆記仍保留；未能更改瀏覽器副本。';return;}store.setRecoveryEnabled(false);store.edit({key,path:[],kind:'remove-key',base:store.snapshot()[key]});void store.flush().then(async result=>{let removed=false;if(result.ok)try{removed=await removeRecoveryCopies();}catch{}status.textContent=removed?'已移除此活動的本機副本；本頁筆記仍保留。':'未能移除儲存副本，請先匯出及檢查瀏覽器設定。';});};
  const render=()=>{
    $('#record-list').innerHTML=records.length?records.map((r,i)=>`<li><span class="record-number">${String(i+1).padStart(2,'0')}</span><div><strong>${esc(r.level)} · ${esc(r.summary)}</strong><p>${esc(r.detail)}</p></div>${identified(r)?`<button type="button" class="text-button remove-record" data-index="${i}" aria-label="刪除紀錄 ${i+1}">移除</button>`:`<span class="small">${language==='en'?'Legacy record · retained in backups':'舊有紀錄・保留於備份'}</span>`}</li>`).join(''):'<li class="empty-record">尚未記錄。比較兩個設定後，再解釋你的觀察。</li>';
    $('#record-count').textContent=`${records.length} / 8`;
    $$('.remove-record').forEach(b=>b.addEventListener('click',()=>{const index=Number(b.dataset.index),row=records[index];if(!identified(row))return;records.splice(index,1);recordOperations.push({kind:'event-remove',value:{eventId:row.eventId}});render();persist();}));
  };
  try {
    const stored=JSON.parse(localStorage.getItem(key)||'null');
    if(stored?.schema===1 && stored.lab===lab && stored.consent===true) {
      box.checked=true;
      fields.forEach(id=>{if(typeof stored.answers?.[id]==='string')$(`#${id}`).value=stored.answers[id];});
      records=readableRecords(stored.records);
      status.textContent='已還原此瀏覽器的筆記；圖像仍使用目前設定。';
    }
  } catch {status.textContent='未能讀取本機筆記；仍可正常操作及匯出。';}
  fields.forEach(id=>fieldBaselines[id]=$(`#${id}`).value);
  if(store)unsubscribe=store.subscribe(state=>{if(!box.checked||saving)return;const value=state.snapshot[key];if(value?.consent!==true){
    box.checked=false;store.setRecoveryEnabled(false);recordOperations=[];
    for(const id of fields){fieldBaselines[id]='';if($(`#${id}`).value)dirtyFields.add(id);}
    printMirror();status.textContent=language==='en'?'Another tab turned off saving for this activity. Your page notes remain in this session.':'另一分頁已取消此活動儲存；本頁筆記仍保留於這次瀏覽。';return;
  }
    for(const id of fields){const control=$(`#${id}`),next=value.answers?.[id];if(typeof next!=='string'||composingFields.has(id))continue;
      const conflict=state.conflicts.some(item=>!item.path.length||item.path[0]==='answers'&&item.path[1]===id);
      if(dirtyFields.has(id)){if(!state.pending&&!conflict&&next===control.value){dirtyFields.delete(id);fieldBaselines[id]=next;}}
      else{if(control.value!==next)control.value=next;fieldBaselines[id]=next;}
    }
    records=readableRecords(value.records);render();printMirror();showState({ok:state.status==='saved',status:state.status});});
  fields.forEach(id=>{const control=$(`#${id}`);control.addEventListener('input',()=>persist(id));control.addEventListener('compositionstart',()=>composingFields.add(id));control.addEventListener('compositionend',()=>{composingFields.delete(id);persist(id);});});
  box.addEventListener('change',()=>{
    if(box.checked)persist();else{for(const id of fields){fieldBaselines[id]='';if($(`#${id}`).value)dirtyFields.add(id);}removeLocal();}
  });
  $('#record').addEventListener('click',()=>{
    if(records.length>=8){say('最多保留 8 筆。請先匯出或移除一筆紀錄。');return;}
    const snap=getSnapshot(); if(!snap){say('請先完成至少一次操作，再記錄。');return;}
    const row={eventId:eventId(),level:levelName(),...snap};records.push(row);recordOperations.push({kind:'append',value:row});render();persist();say(`已加入第 ${records.length} 筆紀錄。`);
  });
  $('#export-json').addEventListener('click',()=>download(`${lab}-learning-record.json`,JSON.stringify({...collect(),current:getSnapshot(),recovery:store?.exportRecovery()},null,2),'application/json;charset=utf-8'));
  $('#export-text').addEventListener('click',()=>{
    const d=collect();const text=[`# ${t(title)}`,t(`版本 ${VERSION} · 本機學習紀錄（並非已提交作業）`),'',
      '## 預測',d.answers.prediction||t('（未填）'),'', '## 觀察紀錄',
      ...records.map((r,i)=>`${i+1}. [${t(r.level)}] ${t(r.summary)}\n   ${t(r.detail)}`),'',
      '## 解釋與修正',d.answers.explanation||t('（未填）'),'', '## 離堂題',$('#exit-question').textContent,d.answers['exit-answer']||t('（未填）'),
      '', t('此紀錄由學生自行編寫；不代表已通過教師評核。')].map(line=>line.startsWith('## ')?t(line):line).join('\n');download(`${lab}-learning-record.txt`,text);
  });
  $('#print').addEventListener('click',()=>{printMirror();window.print();});
  $('#clear-notes').addEventListener('click',()=>{
    if(!confirm(t('清除本活動的預測、紀錄與解釋？此操作不影響其他活動。')))return;
    fields.forEach(id=>{$(`#${id}`).value='';fieldBaselines[id]='';dirtyFields.delete(id);});records=[];recordOperations=[];box.checked=false;
    removeLocal();
    render();printMirror();say('已清除本活動筆記；圖像設定不變。');
  });
  window.addEventListener('pagehide',()=>unsubscribe?.(),{once:true});render();printMirror();return {persist};
}
/** Fixed, responsive SVG plotting area; accessible description is rebuilt with each view. */
export function plotFrame(svg,{xMin,xMax,yMin,yMax,xStep=2,yStep=2,title,description,xLabel='x',yLabel='y'}) {
  title=t(title);description=t(description);xLabel=t(xLabel);yLabel=t(yLabel);
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
