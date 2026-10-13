import {pairs} from './translations.mjs';
export const language=new URL(location.href).searchParams.get('lang')==='en'?'en':'zh-Hant';
const siteRoot=new URL('../',import.meta.url).pathname;
const normalize=s=>String(s).trim().replace(/\s+/g,' ');
const dictionary=new Map(pairs.map(([a,b])=>[normalize(a),b]));
const extra=[
 ['主要導覽','Main navigation'],['程淑鍵','Kenneth Cheng'],['任務與操作','Tasks and controls'],['選擇探究任務','Choose inquiry depth'],['圖像設定','Graph settings'],['動態圖像與數值','Dynamic graph and values'],
 ['我預測……，因為……','I predict … because …'],['我比較了……與……，因此我認為……','I compared … and …; therefore I think …'],['請寫出理由，而不只是答案。','Explain your reasoning, beyond giving an answer.'],
 ['一條向上開口的拋物線與其頂點','An upward-opening parabola and its vertex'],['二次函數的動態圖像','Dynamic quadratic graph'],['正面相對頻率隨試驗次數改變','Relative frequency of heads against trial count'],['序列一的數值','Values for sequence one'],['包含可移動觀測值的散點圖與迴歸線','Scatterplot and regression line with a movable observation'],
 ['## 觀察紀錄','## Observation records'],['## 解釋與修正','## Explanation and revision'],['## 離堂題','## Exit question'],['離開投影模式','Exit projection mode'],['（尚未填寫）','(Not yet written)'],['（未填）','(Not written)'],['移除','Remove'],['目前','Current'],['原有 8 點','Original 8 points'],['觀測值與線性迴歸','Observations and linear regression'],
 ['已儲存在此瀏覽器；不會傳送筆記。','Saved in this browser; notes are not uploaded.'],['目前筆記仍保留；本機保存未完成，請匯出備份。','Your notes are retained; local saving is incomplete. Export a backup.'],['兩個分頁的版本均已保留；匯出包含衝突內容。','Both tab versions are retained; export includes the conflicts.'],
 ['尚未記錄。比較兩個設定後，再解釋你的觀察。','No records yet. Compare two settings, then explain your observations.'],['已還原此瀏覽器的筆記；圖像仍使用目前設定。','Notebook restored from this browser; the graph retains its current settings.'],['未能讀取本機筆記；仍可正常操作及匯出。','Local notes could not be read; you can still operate and export.'],
 ['已移除此活動的本機副本；本頁筆記仍保留。','Removed this activity’s local copy; the current page notes remain.'],['未能移除儲存副本，請先匯出及檢查瀏覽器設定。','Could not remove the local copy. Export first and check browser settings.'],['本頁筆記仍保留；未能更改瀏覽器副本。','Page notes remain; the browser copy could not be changed.'],
 ['最多保留 8 筆。請先匯出或移除一筆紀錄。','Up to eight records. Export or remove a record first.'],['請先完成至少一次操作，再記錄。','Complete a trial or operation before recording.'],['已清除本活動筆記；圖像設定不變。','This activity’s notes were cleared; graph settings remain.'],['清除本活動的預測、紀錄與解釋？此操作不影響其他活動。','Clear this activity’s predictions, records, and explanations? Other activities are unaffected.'],
 ['已複製設定連結；不包含預測、筆記或學生資料。','Settings link copied; it contains no predictions, notes, or student information.'],['請手動複製設定連結。','Copy the settings link manually.'],['此紀錄由學生自行編寫；不代表已通過教師評核。','Student-authored record; it does not imply teacher assessment.'],
 ['圖像已重設；筆記保留。','Graph reset; notes preserved.'],['概率已改變，試驗已重設；筆記保留。','Probability changed and trials reset; notes preserved.'],['重現代碼已改變，試驗已重設；筆記保留。','Seed changed and trials reset; notes preserved.'],['已另起一組，seed 加 1；筆記保留。','New sequence: seed increased by one; notes preserved.'],['已重設試驗，保留 p、seed 及筆記。','Trials reset; p, seed, and notes preserved.'],
 ['所有實數都是零點','All real numbers are zeros'],['沒有實數零點','No real zeros'],['頂點與對稱軸提示已隱藏，可勾選顯示。','Vertex and axis hints are hidden; select the checkbox to show them.'],['a 為 0，是常數函數，沒有唯一頂點。','At a = 0 the function is constant and has no unique vertex.'],['移動點未加入擬合；目前直線等於基準直線。','The movable point is excluded; the current line equals the baseline.'],
 ['程淑鍵的中學數學互動探究原型：以預測、操作、記錄與解釋支援概念學習。','Kenneth Cheng’s secondary mathematics inquiry prototype: predict, operate, record, and explain.']
];
extra.forEach(([a,b])=>dictionary.set(normalize(a),b));
for(const name of ['p','a','h','k','rx','ry']){dictionary.set(name+' 數值',name+' numeric value');dictionary.set(name+' 滑桿',name+' slider');}
const templates=[];
function template(source,target){let pattern='',last=0,slots=[];for(const match of source.matchAll(/\{(\d+)\}/g)){pattern+=source.slice(last,match.index).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(.*?)';slots.push(Number(match[1]));last=match.index+match[0].length;}pattern+=source.slice(last).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');templates.push({regex:new RegExp('^'+pattern+'$','u'),target,slots});}
[
 ['{0} 條序列','{0} sequences'],['每條序列已完成 {0} 次試驗。','Each sequence has completed {0} trials.'],['已顯示 {0} 條不同序列。','Showing {0} distinct sequences.'],['已加入第 {0} 筆紀錄。','Added record {0}.'],['刪除紀錄 {0}','Remove record {0}'],
 ['序列 {0}：{1} 次正面；頻率 {2}','Sequence {0}: {1} heads; frequency {2}'],
 ['{0} 條序列，各 {1} 次試驗；理論概率 {2}。第一條正面次數 {3}，相對頻率 {4}。','{0} sequences with {1} trials each; theoretical probability {2}. The first has {3} heads and relative frequency {4}.'],
 ['頂點為 ({0},{1})，對稱軸 x = {2}。','Vertex ({0},{1}); axis x = {2}.'],
 ['固定刻度的函數圖像。{0}可用數值核對表閱讀座標。','Fixed-scale function graph. {0} Read coordinates in the numerical table.'],
 ['頂點 ({0}, {1})；對稱軸 x = {2}；向上開口。零點：{3}。','Vertex ({0}, {1}); axis x = {2}; opens upwards. Zeros: {3}.'],
 ['頂點 ({0}, {1})；對稱軸 x = {2}；向下開口。零點：{3}。','Vertex ({0}, {1}); axis x = {2}; opens downwards. Zeros: {3}.'],
 ['常數函數：{0}。沒有唯一頂點。','Constant function: {0}. No unique vertex.'],
 ['移動點設定為 ({0}, {1})。','Movable point set to ({0}, {1}).'],
 ['移動點的槓桿值 hᵢ = {0}。它描述 x 位置的特殊程度，並非實際影響力的完整量度。','Movable-point leverage hᵢ = {0}. It describes an unusual x position, rather than measuring influence completely.'],
 ['原有八點斜率 {0}。移動點 ({1},{2}) 已加入擬合；目前斜率 {3}，R 平方 {4}。滑桿和數值輸入提供拖曳的替代操作。','Original eight-point slope {0}. Point ({1},{2}) is included; current slope {3}, R² {4}. Sliders and numeric inputs are alternatives to dragging.'],
 ['原有八點斜率 {0}。移動點 ({1},{2}) 未加入擬合；目前斜率 {3}，R 平方 {4}。滑桿和數值輸入提供拖曳的替代操作。','Original eight-point slope {0}. Point ({1},{2}) is excluded; current slope {3}, R² {4}. Sliders and numeric inputs are alternatives to dragging.'],
 ['點 ({0}, {1}) 加入擬合','Point ({0}, {1}) included in the fit'],['點 ({0}, {1}) 不加入擬合','Point ({0}, {1}) excluded from the fit'],['斜率 {0}；截距 {1}；R² {2}；Δb = {3}','Slope {0}; intercept {1}; R² {2}; Δb = {3}'],
 ['版本 {0} · 本機學習紀錄（並非已提交作業）','Version {0} · Local learning record (work has not been submitted)']
].forEach(([a,b])=>template(a,b));
export function t(input){if(language!=='en')return String(input);const value=normalize(input);if(dictionary.has(value))return dictionary.get(value);for(const item of templates){const match=value.match(item.regex);if(match){const slots={};item.slots.forEach((id,i)=>slots[id]=t(match[i+1]));return item.target.replace(/\{(\d+)\}/g,(_,id)=>slots[id]??'');}}if(value.includes(' / ')){const parts=value.split(' / ');return parts.map(t).join(' / ');}if(value.startsWith('## '))return '## '+t(value.slice(3));return String(input);}
function skip(node){return node.parentElement?.closest('script,style,noscript,textarea,[data-print],.student-writing');}
export function translateDocument(root=document.body){if(language!=='en'||!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode())){if(skip(node))continue;const next=t(node.data);if(next!==node.data)node.data=next;}
 for(const el of root.querySelectorAll('[aria-label],[placeholder],[title],[alt],meta[name="description"]'))for(const attribute of ['aria-label','placeholder','title','alt','content'])if(el.hasAttribute(attribute)){const value=el.getAttribute(attribute),next=t(value);if(next!==value)el.setAttribute(attribute,next);}
 for(const link of root.querySelectorAll('a[href]')){const url=new URL(link.getAttribute('href'),location.href);if(url.origin===location.origin&&url.pathname.startsWith(siteRoot)&&url.pathname.endsWith('.html')&&url.searchParams.get('lang')!=='en'){url.searchParams.set('lang','en');link.href=url.href;}}
}
export function untranslated(root=document.body){const out=[];if(!root)return out;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode()))if(!skip(n)&&/[\u3400-\u9fff]/u.test(n.data))out.push(normalize(n.data));return [...new Set(out)];}
if(language==='en'){document.documentElement.lang='en';document.title=t(document.title);translateDocument(document.head);translateDocument();const observer=new MutationObserver(()=>{observer.disconnect();translateDocument();observer.observe(document.body,{childList:true,subtree:true,characterData:true});});observer.observe(document.body,{childList:true,subtree:true,characterData:true});}
globalThis.MathInquiryI18n={language,t,untranslated};
