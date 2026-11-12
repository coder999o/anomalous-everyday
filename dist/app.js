import {KEY,jobs,endings,fresh,normalize,completed,balanced,solve,finish,correctCode} from './engine.js';
const main=document.querySelector('#main');
let state=fresh(),storageOK=true;
try{state=normalize(JSON.parse(localStorage.getItem(KEY)));}catch{storageOK=false;}
let unlocked=false;
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;}catch{storageOK=false;}updateStatus();}
function updateStatus(){document.querySelector('#save-status').textContent=storageOK?'进度仅保存在此浏览器。':'浏览器未允许存档，本次进度仍可继续，关闭页面后可能丢失。';}
function view(html){main.innerHTML=html;main.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
function home(){
 const n=completed(state);
 view(`<section class="hero"><div><div class="eyebrow">CASE NO. 0001 / 城市级异常</div><h1>明天，<br>暂时不见了<span>。</span></h1><p class="lede">有人把全城的明天洗缩水了。<br>今晚，你是唯一没有下班的调查员。</p><div class="hero-actions"><button class="primary" id="start">${n===3?'打开最终档案':'接手'+(n?'下一份':'第一份')+'委托'} <span>↗</span></button><span class="muted">约 10 分钟 · 没有失败结局</span></div></div><div class="illustration" aria-hidden="true"><div class="orbit orbit-a"></div><div class="orbit orbit-b"></div><div class="moon"></div><div class="ticket"><small>异常物品 / 请轻拿轻放</small><b>一份未使用的<br>明天</b><span>有效期：直到你准备好</span><div class="barcode"></div></div><div class="stamp">暂存<br>人间</div><span class="star s1">✦</span><span class="star s2">✧</span><span class="caption">图 01. 从洗衣机里打捞出的时间</span></div></section>
 <section class="desk"><div class="section-head"><div><div class="eyebrow">YOUR NIGHT SHIFT</div><h2>今晚的委托</h2></div><span class="count">${n} / 3 已归档</span></div><div class="job-grid">${jobs.map(j=>`<button class="job ${state.solved[j.id]?'done':''}" data-job="${j.id}"><span class="job-top"><span>${j.tag}</span><span>${state.solved[j.id]?'已归档 ✓':j.time}</span></span><span class="job-icon">${j.icon}</span><small>委托 ${j.number}</small><h3>${j.title}</h3><span class="job-bottom">${j.place}<b>↗</b></span></button>`).join('')}</div></section>
 <section class="archive"><div><div class="eyebrow">EVIDENCE LOCKER</div><h2>口袋里的不可能</h2><p>${n?'已收集的线索不会消失。按委托编号排列，也许它们在说什么。':'每完成一份委托，就带回一件异常物品。'}</p></div><div class="evidence">${jobs.map(j=>`<div class="evidence-item ${state.solved[j.id]?'found':''}"><span>${state.solved[j.id]?j.word:'?'}</span><small>${state.solved[j.id]?j.artifact:'待发现 · '+j.number}</small></div>`).join('')}</div><button class="${n===3?'primary':''}" id="final" ${n<3?'disabled':''}>${state.ending?'重读你的结局':n===3?'明天的仓库已开启 ↗':'收集全部线索后解锁'}</button></section>`);
 document.querySelector('#start').onclick=()=>n===3?finalRoom():jobView(jobs.find(j=>!state.solved[j.id]).id);
 document.querySelectorAll('[data-job]').forEach(b=>b.onclick=()=>jobView(b.dataset.job));
 document.querySelector('#final').onclick=()=>state.ending?endingView():finalRoom();
}
function jobView(id){const j=jobs.find(j=>j.id===id),choice=state.solved[id];
 view(`<button class="back" id="back">← 返回事务所</button><article class="story"><div class="eyebrow">委托 ${j.number} / ${j.place}</div><div class="story-icon">${j.icon}</div><h1>${j.title}</h1><p class="narrative">${j.intro}</p><div class="clue"><small>现场记录 / 线索</small><p>${j.clue}</p></div>${choice?`<div class="outcome"><span class="eyebrow">已归档 · ${j.artifact}</span><p>${j.choices.find(c=>c[0]===choice)[2]}</p><p>你收好了线索「${j.word}」。</p></div>`:`<h2>${j.question}</h2><div class="choices">${j.choices.map(c=>`<button data-choice="${c[0]}">${c[1]} <span>↗</span></button>`).join('')}</div>`}<details><summary>一件可以在现实里做的小事</summary><p>${j.prompt}</p></details>${choice?'<button class="primary" id="continue">带上线索，回事务所 →</button>':''}</article>`);
 document.querySelector('#back').onclick=home;
 document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{state=solve(state,id,b.dataset.choice);save();jobView(id);});
 if(choice)document.querySelector('#continue').onclick=home;
}
function finalRoom(){if(completed(state)<3)return home();
 view(`<button class="back" id="back">← 返回事务所</button><article class="story"><div class="eyebrow">FINAL FILE / 明天的仓库</div><div class="story-icon">▧</div><h1>门没有锁。<br>它只是在等一句话。</h1><p class="narrative">三件物品轻轻发亮。按照委托 01 → 03，把上面的字连起来。这不是密码，而是你可以对自己说的一句话。</p><form id="code-form"><label for="code">写下那三个字</label><div class="code-row"><input id="code" name="code" maxlength="20" autocomplete="off" placeholder="线索在你的口袋里" required><button class="primary">轻轻推门</button></div><p id="code-error" role="status"></p></form><details><summary>需要一点提示？</summary><p>透明车票「留」→ 无字请假条「一」→ 月光洗标「天」。输入“留一天”。</p></details><div id="ending-choices"></div></article>`);
 document.querySelector('#back').onclick=home;
 document.querySelector('#code-form').onsubmit=e=>{e.preventDefault();if(correctCode(document.querySelector('#code').value)){unlocked=true;showEndingChoices();}else document.querySelector('#code-error').textContent='再看看三件物品上的字。这里没有次数限制。';};
 if(unlocked)showEndingChoices();
}
function showEndingChoices(){document.querySelector('#code-form').hidden=true;document.querySelector('#ending-choices').innerHTML=`<h2>你想把明天还成什么样子？</h2><p>你的选择没有对错。${balanced(state)?'你既懂得保留，也懂得放手，第三条路亮起来了。':'第三条路需要在委托里同时尝试“保留”与“放手”。重玩时也许会发现。'}</p><div class="choices"><button data-ending="garden">在时间里种一座花园 ↗</button><button data-ending="sea">让城市向未知出发 ↗</button>${balanced(state)?'<button data-ending="window">给明天留一扇窗 ✦</button>':''}</div>`;document.querySelectorAll('[data-ending]').forEach(b=>b.onclick=()=>{state=finish(state,b.dataset.ending,'留一天');save();endingView();});}
function endingView(){const e=endings[state.ending];view(`<article class="story ending"><div class="eyebrow">${e.label}</div><div class="story-icon">✦</div><h1>${e.title}</h1><p class="narrative">${e.text}</p><div class="clue"><small>事务所结案回执</small><p>不必一次解决整个人生。<br>留一天，给还没发生的好事情。</p></div><p>案件 0001 已归档。感谢你替这座城市值了一次夜班。</p><div class="actions"><button class="primary" id="back">回到事务所</button><button id="alternate">试试另一种明天</button></div></article>`);document.querySelector('#back').onclick=home;document.querySelector('#alternate').onclick=()=>{unlocked=true;finalRoom();};}
document.querySelector('.brand').onclick=e=>{e.preventDefault();home();};
const dialog=document.querySelector('#reset-dialog');
document.querySelector('#reset').onclick=()=>dialog.showModal();document.querySelector('#cancel-reset').onclick=()=>dialog.close();document.querySelector('#confirm-reset').onclick=()=>{state=fresh();unlocked=false;save();dialog.close();home();};
home();updateStatus();
