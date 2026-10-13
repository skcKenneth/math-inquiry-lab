// Keep this historical Project Pages entry useful without moving or rewriting notes.
const english=new URL(location.href).searchParams.get('lang')==='en';
const lab=location.pathname.match(/\/labs\/(quadratic|probability|regression)\.html$/)?.[1];
const destination=new URL(english?'/teaching/math/':'/zh/teaching/math/','https://skckenneth.github.io');
if(lab)destination.searchParams.set('activity',`lab:${lab}`);
const banner=document.createElement('aside');
banner.className='canonical-workspace wrap';
banner.setAttribute('aria-label',english?'Unified mathematics workspace':'統一數學教學工作區');
const title=document.createElement('strong');
title.textContent=english?'Unified mathematics workspace':'統一數學教學工作區';
const text=document.createElement('span');
text.textContent=english?'Open this activity alongside the other mathematics interactions. Local notes on this page remain available.':'在統一工作區開啟同一活動，亦可查看其他數學互動。此頁的本機筆記仍可繼續使用。';
const link=document.createElement('a');
link.href=destination.href;
link.dataset.canonicalWorkspace='';
link.textContent=english?'Open the workspace ↗':'前往統一工作區 ↗';
banner.append(title,text,link);
document.querySelector('.site-header')?.after(banner);
