/* CleanEat — 화면 동작: 홈·질문·결과 화면 전환, 버튼, 입력. data.js·engine.js 다음에 불러옴 */
/* ===== UI:START — 여기부터는 화면·전역 상태 (계산에는 쓰지 않음) ===== */
const $=s=>document.querySelector(s);
// 메뉴 카드의 '분량 보기'·'영양성분 보기'는 한 번에 하나만 열고, 바깥을 누르거나 Esc를 누르면 닫음
document.addEventListener('click',e=>document.querySelectorAll('.card details[open]').forEach(d=>{if(!d.contains(e.target))d.open=false}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.card details[open]').forEach(d=>d.open=false)});
let step=0,off=0,A={basic:{},goal:null,act:null,excl:[],pro:null,cu:null,prep:null,budget:null,sel:{}};
/* 방문 통계(GoatCounter, 쿠키 없음): goatcounter.com에서 만든 사이트 코드를 넣으면 켜짐. 비어 있으면 아무것도 보내지 않음 */
const GC_CODE='';
if(GC_CODE&&location.protocol.startsWith('http')){const s=document.createElement('script');s.async=true;s.src='https://gc.zgo.at/count.js';s.dataset.goatcounter=`https://${GC_CODE}.goatcounter.com/count`;document.head.appendChild(s)}
const evSeen=new Set();
function ev(name,once){if(once){if(evSeen.has(name))return;evSeen.add(name)}try{window.goatcounter&&goatcounter.count&&goatcounter.count({path:name,title:name,event:true})}catch(e){}}
const TOTAL=QUESTIONS.length+1,LABELS=['기본 정보',...QUESTIONS.map(q=>q.l)];
function show(v){['home','quiz','res'].forEach(i=>$('#'+i).hidden=i!==v);window.scrollTo(0,0)}
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{ev('quiz-start',1);step=0;show('quiz');draw()});
function goHome(id){show('home');const e=id&&document.getElementById(id);if(e)e.scrollIntoView({behavior:'smooth'})}
$('#logo').onclick=()=>goHome();
document.querySelectorAll('[data-to]').forEach(b=>b.onclick=()=>goHome(b.dataset.to));
['leaf','spark','pie','loop'].forEach((k,i)=>$('#ri'+(i+1)).innerHTML=ICON[k]);
(()=>{const E=EXAMPLE,b=E.basic,R=buildDay(E,0);if(R.blocked)return;
 $('#exwho').textContent=`예시: ${b.ag}세 ${b.sx==='m'?'남성':'여성'} · ${b.ht}cm · ${b.wt}kg · ${optLabel('act',E)} 운동`;
 $('#ex').innerHTML=planHTML(R,E)})();
function wrap(inner){return `<div class="top"><span class="lab">YOUR PERSONAL FOOD GUIDE</span><span class="cnt">${String(step+1).padStart(2,'0')} / ${String(TOTAL).padStart(2,'0')}</span></div><div class="bar"><i style="width:${(step+1)/TOTAL*100}%"></i></div><div class="qg"><ol class="jn" aria-label="진행 단계">${LABELS.map((l,i)=>`<li class="${i===step?'on':i<step?'dn':''}"${i===step?' aria-current="step"':''}><b>${i<step?'✓':String(i+1).padStart(2,'0')}</b><span>${l}</span></li>`).join('')}</ol><div class="qm">${inner}</div></div>`}
function draw(){
 const q=$('#quiz');
 if(step===0){const b=A.basic;
  q.innerHTML=wrap(`<div class="q"><p class="stp">STEP 01</p><h2>먼저, 지금의 나를 알려주세요</h2><p class="mut">입력한 값은 이 페이지 안에서만 계산에 쓰입니다.</p>
  <label class="f" for="sx">성별</label><select id="sx"><option value="">선택해 주세요</option><option value="m">남성</option><option value="f">여성</option></select>
  <div class="g2"><div><label class="f" for="ag">나이 (세)</label><input id="ag" type="number" inputmode="numeric" placeholder="예: 25"></div><div><label class="f" for="ht">키 (cm)</label><input id="ht" type="number" inputmode="decimal" placeholder="예: 170"></div></div>
  <label class="f" for="wt">몸무게 (kg)</label><input id="wt" type="number" inputmode="decimal" placeholder="예: 65">
  <p class="f" style="margin-top:20px;font-weight:500">해당하는 항목이 있으면 체크해 주세요</p>
  <label class="chk"><input type="checkbox" id="c1">임신 중이거나 수유 중입니다</label>
  <label class="chk"><input type="checkbox" id="c2">식이 제한이 필요한 질환이 있습니다 (당뇨, 신장질환 등)</label>
  <label class="chk"><input type="checkbox" id="c3">섭식장애 병력이 있습니다</label>
  <p class="err" id="err" role="alert"></p><div class="nav"><span></span><button class="tl nx" id="nx">다음 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button></div></div>`);
  $('#sx').value=b.sx||'';['ag','ht','wt'].forEach(k=>$('#'+k).value=b[k]||'');$('#c1').checked=!!b.c1;$('#c2').checked=!!b.c2;$('#c3').checked=!!b.c3;
  $('#nx').onclick=checkBasic;fitQ();return}
 const Q=QUESTIONS[step-1],exl=exList(A);
 if(Q.id==='pro'&&A.sel.pro!==undefined&&proBlocked(A.pro,exl)){A.pro=null;delete A.sel.pro}
 const presets=Q.pre?`<div class="pre"><button type="button" class="btn o" data-pre="veg">채식 (육류·해산물 제외)</button><button type="button" class="btn o" data-pre="vegan">비건 (육류·해산물·달걀·유제품 제외)</button></div>`:'';
 q.innerHTML=wrap(`<div class="q"><p class="stp">STEP ${String(step+1).padStart(2,'0')}</p><h2>${Q.t}</h2><p class="mut">${Q.h}</p>${presets}<div id="os"${Q.multi?' class="ms"':''}></div>${Q.note?`<p class="qn">${Q.note}</p>`:''}${Q.warn?`<p class="qw">${Q.warn}</p>`:''}<p class="err" id="err" role="alert"></p><div class="nav"><button class="tl bk" id="bk"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> 이전</button><button class="tl nx" id="nx">${step===TOTAL-1?'식단 보기':'다음'} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button></div></div>`);
 const os=$('#os'),isOn=(o,i)=>Q.multi?A.excl.includes(o[0]):A.sel[Q.id]===i;
 Q.o.forEach((o,i)=>{const b=document.createElement('button');b.className='opt';b.type='button';
  const dis=Q.id==='pro'&&proBlocked(o[0],exl);
  b.innerHTML=`<span class="rd">${CHK}</span><span>${o[1]}${dis?'<small>제한 식품 선택과 맞지 않아 고를 수 없어요</small>':o[2]?`<small>${o[2]}</small>`:''}</span><span class="cv">${CHEV}</span>`;
  b.disabled=dis;b.setAttribute('aria-pressed',isOn(o,i));
  b.onclick=()=>{$('#err').textContent='';
   if(Q.multi){let e=A.excl;if(o[0]==='none')e=['none'];else{e=e.filter(x=>x!=='none');e=e.includes(o[0])?e.filter(x=>x!==o[0]):[...e,o[0]]}A.excl=e}
   else{A[Q.id]=o[0];A.sel[Q.id]=i}
   [...os.children].forEach((c,j)=>c.setAttribute('aria-pressed',isOn(Q.o[j],j)));$('#nx').disabled=!ready(Q)};
  os.appendChild(b)});
 q.querySelectorAll('[data-pre]').forEach(b=>b.onclick=()=>{A.excl=[...PRESET[b.dataset.pre]];draw()});
 $('#nx').disabled=!ready(Q);
 $('#bk').onclick=()=>{step--;draw()};
 $('#nx').onclick=()=>{
  if(Q.id==='goal'&&bmiBlock(A)){$('#err').textContent=BMI_MSG;return}
  if(step===TOTAL-1){off=0;result();show('res')}else{step++;ev('step-'+String(step+1).padStart(2,'0'),1);draw()}};
 fitQ();
}
/* 질문 화면 맞춤: 질문 문장이 한 줄을 넘으면 글자 크기를 줄이고, 목차를 다음 버튼 바로 위까지 늘림 */
function fitQ(){
 const h=$('#quiz .q h2'),jn=$('#quiz .jn'),nav=$('#quiz .nav');if(!h)return;
 // 여러 개 고르는 단계(제한 식품): 안내 문구가 있어도 아래 선이 다른 단계와 같은 높이에 오도록,
 // 같은 화면을 일반 선택지(안내 문구 없음)로 잠깐 바꿔 선 위치를 재고, 그 차이만큼 선택지 칸을 고르게 늘림
 const os=$('#os');if(os&&os.classList.contains('ms')&&innerWidth>760){
  const ex=[...$('#quiz .q').querySelectorAll('.qn,.qw')],top=()=>nav.getBoundingClientRect().top-os.getBoundingClientRect().top;
  os.style.height='';os.classList.remove('ms');ex.forEach(e=>e.style.display='none');const want=top();
  os.classList.add('ms');ex.forEach(e=>e.style.display='');const now=top();
  if(want>now)os.style.height=(os.getBoundingClientRect().height+want-now)+'px';
 }
 h.style.fontSize='';h.style.whiteSpace='';if(h.scrollWidth>h.clientWidth){const f=parseFloat(getComputedStyle(h).fontSize);h.style.fontSize=Math.max(18,f*h.clientWidth/h.scrollWidth*.98)+'px';if(h.scrollWidth>h.clientWidth)h.style.whiteSpace='normal'}
 jn.style.height='';if(innerWidth>760)jn.style.height=Math.max(0,nav.getBoundingClientRect().top-jn.getBoundingClientRect().top-12)+'px';
}
addEventListener('resize',()=>{if(!$('#quiz').hidden)fitQ()});
function ready(Q){return Q.multi?true:A.sel[Q.id]!==undefined}  // 제한 식품은 선택하지 않아도 진행
function checkBasic(){
 const g=k=>$('#'+k).value,b=A.basic={sx:g('sx'),ag:+g('ag'),ht:+g('ht'),wt:+g('wt'),c1:$('#c1').checked,c2:$('#c2').checked,c3:$('#c3').checked},e=$('#err');
 const m=validateBasic(b);if(m){e.textContent=m;e.scrollIntoView({block:'nearest'});return}
 e.textContent='';ev('step-02',1);step=1;draw();
}
let curR=null,seenBy=[];const have=new Set();  // '있어요'로 체크한 재료(바꾸기·세 끼 바꾸기 뒤에도 유지)
function updG(){const n=[...document.querySelectorAll('#res .gl .buy input')].filter(i=>!i.checked).length,e=$('#gcnt');if(e)e.textContent=n?`사야 할 재료 ${n}가지`:'모두 챙겼어요'}
function wireG(r){r.querySelectorAll('.gl input').forEach(i=>{i.checked=have.has(i.dataset.id);i.onchange=()=>{i.checked?have.add(i.dataset.id):have.delete(i.dataset.id);ev('grocery-check',1);updG()}});updG()}
  // 지금 보이는 결과와, 끼니별로 이미 보여 준 메뉴
function result(){
 const r=$('#res'),R=buildDay(A,off);
 if(R.blocked){r.innerHTML=`<h2>체중 감량 식단은 만들지 않습니다</h2><p class="err">${R.msg}</p><div class="nav"><button class="btn o" id="re">답변 수정</button></div>`;$('#re').onclick=()=>{step=1;show('quiz');draw()};ev('blocked',1);return}
 ev('result/'+A.goal,1);curR=R;seenBy=R.meals.map(e=>e?[e.m.id]:[]);
 renderRes();
}
function renderRes(swapped){
 const r=$('#res');r.innerHTML=dayResultHTML(curR,A);
 $('#re').onclick=()=>{ev('edit-answers');step=0;show('quiz');draw()};$('#sh').onclick=()=>{ev('swap-all');off++;result();window.scrollTo(0,0)};
 wireG(r);
 r.querySelectorAll('[data-swap]').forEach(b=>b.onclick=()=>{
  ev('swap');const i=+b.dataset.swap;curR=swapMeal(A,curR,i,seenBy[i]);const e=curR.meals[i];if(e)seenBy[i].push(e.m.id);renderRes(i)});
 if(swapped!=null){r.querySelectorAll('.card')[swapped].classList.add('sw');const b=r.querySelector(`[data-swap="${swapped}"]`);if(b)b.focus({preventScroll:true})}
}
