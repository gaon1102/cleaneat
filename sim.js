// CleanEat 계산 엔진 무작위 시뮬레이션 (화면 없이 js/data.js + js/engine.js만 불러서 돌림)
// 사용법: node sim.js [반복 횟수, 기본 5000]   — index.html이 있는 폴더에서 실행
// 무작위 가상 사용자로 하루 식단을 만들어 열량·단백질 부족, 예산 초과, 제한 식품 위반, 화면 HTML 오류 등을 셉니다.
// 선택지 값은 js/data.js의 QUESTIONS에서 읽으므로 질문을 바꿔도 따로 고칠 필요가 없습니다.
const fs=require('fs'),path=require('path');
const N=+(process.argv[2]||5000);
const src=['js/data.js','js/engine.js'].map(f=>fs.readFileSync(path.join(__dirname,f),'utf8')).join('\n');
const L=new Function(src+';return{CONFIG,QUESTIONS,MENUS,ING,MED_IDS,buildDay,swapMeal,dayResultHTML,proBlocked,bmiBlock,naMax}')();
const {CONFIG,QUESTIONS,MENUS,ING,MED_IDS,buildDay,swapMeal,dayResultHTML,proBlocked,naMax}=L;
const opt=id=>QUESTIONS.find(q=>q.id===id).o.map(o=>o[0]);

let seed=12345;const rnd=()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296};  // 같은 결과가 나오도록 고정 시드
const R=(a,b)=>a+rnd()*(b-a),pick=a=>a[Math.floor(rnd()*a.length)];
const EXCL=opt('excl'),BUDGETS=opt('budget');
const mkA=()=>{
 const excl=EXCL.filter(()=>rnd()<.15);
 let pro=pick(opt('pro'));if(proBlocked(pro,excl))pro='any';  // 화면에서 막는 조합은 만들지 않음
 return{basic:{sx:pick(['m','f']),ag:Math.round(R(18,70)),ht:R(150,190),wt:R(45,100)},
  goal:pick(opt('goal')),act:pick(opt('act')),excl,pro,cu:pick(opt('cu')),prep:pick(opt('prep')),budget:pick(BUDGETS),sel:{}};
};
// 정제 탄수화물만 쓴 끼니(통곡물 없이 쌀국수·라이스페이퍼·만두피만): 세 끼 모두 이런 날은 없어야 함(활력 목표 기준, 다른 목표도 함께 셈)
const REF=new Set(['ricenoodle','ricepaper','dumpwrap']),WHOLE=new Set(['brice','oat','quinoa','bread','tortilla','pasta','soba','barley','couscous','ricepack','wflour','granola']);
const refOnly=m=>m.items.some(([i])=>REF.has(i))&&!m.items.some(([i])=>WHOLE.has(i));
const S={ref3:0,hN:0,hOver:0,hNote:0,n:0,blocked:0,crash:0,violate:0,empty:0,dup:0,kLow:0,pLow:0,pNote:0,htmlFail:0,swapFail:0,cuN:0,cuHit:0,prefN:0,prefHit:0};
const byB={};BUDGETS.forEach(b=>byB[b]={n:0,over:0,lvl:0,pLow:0,cost:[]});
const used=new Set(),q=(a,p)=>{a=[...a].sort((x,y)=>x-y);return a[Math.floor(a.length*p)]||0};
for(let t=0;t<N;t++){
 const A=mkA();let D;
 try{D=buildDay(A,t%3)}catch(e){S.crash++;if(S.crash<3)console.log(e);continue}
 if(D.blocked){S.blocked++;continue}
 S.n++;const ms=D.meals.filter(Boolean),b=byB[A.budget];b.n++;
 if(ms.length<3)S.empty++;
 if(ms.some(e=>e.m.items.some(([id])=>ING[id].ex.some(x=>A.excl.includes(x)))))S.violate++;
 if(new Set(ms.map(e=>e.m.id)).size<ms.length)S.dup++;
 ms.forEach(e=>used.add(e.m.id));
 if(ms.length===3&&ms.every(e=>refOnly(e.m)))S.ref3++;
 if(A.goal==='health'){S.hN++;if(D.tot.na>naMax(A))S.hOver++;if(D.notes.some(x=>x.includes('나트륨')))S.hNote++}  // 식습관 교정: 식재료 기준 하루 나트륨 상한 초과
 if(D.tot.k<.85*D.T.k)S.kLow++;
 if(D.tot.p<.85*D.T.p){S.pLow++;b.pLow++}
 if(D.notes.some(x=>x.includes('단백질이 목표보다')))S.pNote++;
 if(A.budget<1e9&&D.tot.c>A.budget)b.over++;
 if(ms.some(e=>e.m.lvl>A.prep))b.lvl++;
 b.cost.push(D.tot.c);
 if(A.cu!=='any'){S.cuN++;S.cuHit+=ms.filter(e=>A.cu==='med'?MED_IDS.has(e.m.id):e.m.cu===A.cu).length/3}
 if(D.pro!=='any'){S.prefN++;S.prefHit+=ms.slice(1).filter(e=>e.m.pro===A.pro||(A.pro==='meat'&&['chicken','red'].includes(e.m.pro))).length/2}
 try{const h=dayResultHTML(D,A);if(!h.includes('class="cards"')||/undefined|NaN/.test(h))S.htmlFail++}catch(e){S.htmlFail++}
 if(t%4===0)try{const W=swapMeal(A,D,t%3,[]);if(/undefined|NaN/.test(dayResultHTML(W,A)))S.swapFail++}catch(e){S.swapFail++}
}
const pct=(a,n)=>(100*a/n).toFixed(1)+'%';
console.log(`가상 사용자 ${N}명 → 식단 ${S.n}개 (차단 ${S.blocked}, 오류 ${S.crash})`);
console.log(`열량 15% 넘게 부족 ${pct(S.kLow,S.n)} | 단백질 15% 넘게 부족 ${pct(S.pLow,S.n)} (보충 안내 표시 ${pct(S.pNote,S.n)})`);
console.log(`음식 취향 일치 ${pct(S.cuHit,S.cuN)} | 선호 단백질(점심·저녁) ${pct(S.prefHit,S.prefN)} | 쓰인 메뉴 ${used.size}/${MENUS.filter(m=>m.slot!=='s').length}`);
console.log(`제한 식품 위반 ${S.violate} | 빈 끼니 ${S.empty} | 같은 날 중복 ${S.dup} | 결과 HTML 오류 ${S.htmlFail} | 바꾸기 오류 ${S.swapFail}`);
console.log(`세 끼 모두 정제 탄수화물만인 날 ${S.ref3} (정제 탄수화물만 쓰는 아침 메뉴 ${MENUS.filter(m=>m.slot==='a'&&refOnly(m)).length}개)`);
console.log(`식습관 교정 ${S.hN}건: 나트륨 나이별 상한(2300/1900/1800mg) 초과 ${pct(S.hOver,S.hN)} (안내 표시 ${pct(S.hNote,S.hN)})`);
console.log('예산별: 예산 초과 / 요리 수준 넘는 끼니 / 단백질 부족 / 하루 식비 중앙값');
BUDGETS.forEach(k=>{const b=byB[k];console.log(`  ${k>=1e9?'제한 없음':k.toLocaleString()+'원'}  ${pct(b.over,b.n)} / ${pct(b.lvl,b.n)} / ${pct(b.pLow,b.n)} / ${Math.round(q(b.cost,.5)).toLocaleString()}원`)});
