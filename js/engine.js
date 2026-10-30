/* CleanEat — 계산 엔진과 결과 HTML 조각. 화면(DOM)에 의존하지 않음.
   sim.js 같은 시험 스크립트는 data.js + engine.js만 불러서 돌림. data.js 다음, main.js 전에 불러옴 */
/* ============ 5. 로직 (계산 전용 — 화면(DOM)에 의존하지 않으며 입력별 메모리 캐시 사용. 정적 페이지 생성에도 그대로 씁니다) ============ */
const num=n=>Math.round(n).toLocaleString('ko-KR'),won=n=>Math.round(n/100)*100;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const mkv=(m,x=1)=>m.items.reduce((s,[i,g])=>({k:s.k+ING[i].k*g*x/100,p:s.p+ING[i].p*g*x/100,f:s.f+ING[i].f*g*x/100,cb:s.cb+ING[i].cb*g*x/100,c:s.c+ING[i].c*g*x/100,na:s.na+ING[i].na*g*x/100}),{k:0,p:0,f:0,cb:0,c:0,na:0});
const addV=(a,v)=>({k:a.k+v.k,p:a.p+v.p,f:a.f+v.f,cb:a.cb+v.cb,c:a.c+v.c,na:a.na+v.na}),V0={k:0,p:0,f:0,cb:0,c:0,na:0};
const exList=A=>A.excl.filter(x=>x!=='none');
const hasEx=(m,ex)=>m.items.some(([id])=>ING[id].ex.some(t=>ex.includes(t)));
/* 선호 단백질과 메뉴가 맞는지. '육류'(meat)는 닭고기(chicken)·소·돼지(red) 메뉴를 모두 포함 */
const proMatch=(m,pro)=>m.pro===pro||(pro==='meat'&&(m.pro==='chicken'||m.pro==='red'));
/* 기본 정보 검증: 오류 문구를 돌려주고, 통과하면 '' */
function validateBasic(b){
 if(!b.sx||!b.ag||!b.ht||!b.wt)return'성별, 나이, 키, 몸무게를 모두 입력해 주세요.';
 if(b.ag<10||b.ag>100||b.ht<120||b.ht>220||b.wt<30||b.wt>250)return'입력값이 현실적인 범위를 벗어났어요. 나이는 10~100, 키는 120~220cm, 몸무게는 30~250kg 범위로 입력해 주세요.';
 if(b.ag<CONFIG.minAge)return'만 18세 미만은 열량 기준 식단을 만들지 않습니다. 성장기에는 보호자, 의사, 영양사와 상담해 주세요.';
 if(b.c1||b.c2||b.c3)return'선택하신 항목에 해당하면 이 도구의 식단은 맞지 않을 수 있습니다. 의사나 영양사와 상담해 주세요.';
 return'';
}
const BMI_MSG='입력하신 키와 몸무게로는 체중 감량을 목표로 하는 식단이 적절하지 않을 수 있습니다. 의사나 영양사와 상담해 주세요. 다른 목표를 고르거나 이전 단계에서 입력값을 확인해 주세요.';
const bmiBlock=A=>A.goal==='lose'&&A.basic.wt/Math.pow(A.basic.ht/100,2)<CONFIG.bmiMin;
/* 제한 식품과 맞지 않는 단백질 선택지 */
const proBlocked=(v,ex)=>(v==='meat'||v==='chicken'||v==='red')?ex.includes('육류'):v==='fish'?ex.includes('해산물'):v==='egg'?(ex.includes('달걀')&&ex.includes('유제품')):false;
const splitOf=A=>CONFIG.splitBy[A.goal]||CONFIG.split;  // 목표별 끼니 비율
function targetOf(A){
 const b=A.basic,bmr=10*b.wt+6.25*b.ht-5*b.ag+(b.sx==='m'?5:-161);
 let k=bmr*CONFIG.activity[A.act]*CONFIG.goalMul[A.goal],floored=false;
 const fl=CONFIG.kcalFloor[b.sx];if(k<fl){k=fl;floored=true}
 const ref=CONFIG.protRefBmi*Math.pow(b.ht/100,2),pw=b.wt>ref?ref+CONFIG.protExcess*(b.wt-ref):b.wt;  // 단백질용 체중(조정체중)
 return{k,p:pw*CONFIG.protPerKg[A.goal],floored};
}
/* 끼니 i에 메뉴를 고를 때의 공통 기준 (planDays와 swapMeal이 함께 씀)
   xOf: 목표 열량에 맞춘 분량 배수 / rel: 조건 초과 수(요리 수준 + 예산) / fit: 목표 맞춤 벌점 / cuPen: 음식 취향 벌점 */
/* 나트륨 하루 상한(mg): 나이별 만성질환위험감소섭취량. 75세 이상 1,800 / 65~74세 1,900 / 그 외 2,300 */
const naMax=A=>{const S=CONFIG.sodium,g=+(A.basic&&A.basic.ag)||0,r=S.byAge.find(([a])=>g>=a);return r?r[1]:S.max};
function slotRules(A,T,i,capIn,naIn){
 const w=splitOf(A)[i],isM=CONFIG.slots[i]==='m',cap=capIn===undefined?A.budget*w:capIn;
 // 예산 비교는 목표 열량에 맞춰 늘리거나 줄인 실제 분량 기준 (기본 분량으로 비교하면 2배로 늘린 뒤 예산을 넘는 경우가 생김)
 const xOf=m=>clamp(T.k*w/mkv(m).k,CONFIG.portion.min,CONFIG.portion.max);
 // 요리 수준 초과를 예산 초과보다 무겁게 봄 (못 만드는 메뉴는 쓸 수 없지만, 예산을 조금 넘는 건 받아들일 수 있음)
 const rel=m=>Math.max(0,m.lvl-A.prep)*CONFIG.prepOverBudget+(mkv(m,xOf(m)).c>cap?1:0);
 // 예산을 넘는 메뉴끼리는 덜 넘는 쪽을 고르도록, 넘은 금액(이 끼니 원래 몫 대비 비율)에 비례한 작은 벌점. 요리 수준 1단계 초과(30점)보다 훨씬 작게 둠
 const over=m=>{const c=mkv(m,xOf(m)).c;return c>cap?CONFIG.overCost*(c-cap)/(A.budget*w):0};
 // 목표 맞춤 벌점: 분량 상한(2배)으로도 열량을 못 채우면 kcal 벌점, 맞춘 분량의 단백질이 끼니 목표보다 모자란 만큼 비례해 prot 벌점 (감량·근육 증가 목표의 단백질 부족을 줄이려고 구간식 70% 기준에서 바꿈)
 const fit=m=>{const b=mkv(m),raw=T.k*w/b.k,x=clamp(raw,CONFIG.portion.min,CONFIG.portion.max);return(raw>CONFIG.portion.max?CONFIG.fit.kcal:0)+CONFIG.fit.prot*Math.max(0,1-b.p*x/(T.p*w))};
 const cuPen=m=>A.cu&&A.cu!=='any'&&(A.cu==='med'?!MED_IDS.has(m.id):m.cu!==A.cu)?(isM?CONFIG.cuPenalty.m:CONFIG.cuPenalty.a):0;
 // 목표별 구성 벌점 — 유지: 열량 중 단백질·지방·탄수화물 비율이 적정 범위를 벗어난 만큼 / 활력: 끼니당 채소·과일이 기준보다 적은 만큼 + 지방 비율이 상한을 넘는 만큼
 const out=(v,[lo,hi])=>Math.max(0,lo-v,v-hi);
 // 식습관 교정: 하루 나트륨 상한에서 앞 끼니가 쓰고 남은 이 끼니의 한도(naIn)를 넘은 만큼, 끼니 몫 대비 비율에 비례한 벌점
 const goalPen=m=>{
  if(A.goal==='health'){const S=CONFIG.sodium,M=naMax(A),lim=naIn===undefined?M*w:naIn;return S.w*Math.max(0,mkv(m,xOf(m)).na-lim)/(M*w)}
  if(A.goal!=='keep'&&A.goal!=='energy')return 0;
  const b=mkv(m),fr=b.f*9/b.k;
  if(A.goal==='keep'){const B=CONFIG.balance;return B.w*(out(b.p*4/b.k,B.p)+out(fr,B.f)+out(b.cb*4/b.k,B.cb))}
  const E=CONFIG.energy,vg=m.items.reduce((s,[id,g])=>VEG_FRUIT.has(id)?s+g:s,0)*xOf(m);
  return E.vegW*Math.max(0,1-vg/E.veg)+E.fatW*Math.max(0,fr-E.fatMax);
 };
 return{w,isM,xOf,rel,over,fit,cuPen,goalPen};
}
/* n일치 메뉴 선택 (공통 엔진). 같은 입력과 seed면 항상 같은 결과(결정적). seed를 바꾸면 다른 조합
   d일째는 앞날들의 결과로만 정해지므로, 같은 입력으로 이미 계산한 날은 기억해 두고 이어서 계산함
   ('세 끼 모두 바꾸기'를 누를 때마다 1일차부터 다시 계산해 점점 느려지던 문제) */
const planCache=new Map();
function planDays(A,seed,n){
 const key=JSON.stringify([A.basic,A.goal,A.act,A.excl,A.pro,A.cu,A.prep,A.budget,seed]);
 let C=planCache.get(key);
 if(!C){
  if(planCache.size>=20)planCache.delete(planCache.keys().next().value);  // 오래된 입력부터 버림(답변 수정·준비 방식 대안 계산용으로 충분)
  const T=targetOf(A),ex=exList(A);
  C={T,ex,pro:proBlocked(A.pro,ex)?'any':A.pro,use:{},cat:{},relaxed:0,none:0,capped:0,mj:0,prevIds:[],days:[],snap:[]};
  planCache.set(key,C);
 }
 const {T,ex,pro,use,cat}=C,S=CONFIG.slots,w=splitOf(A),days=C.days;
 let {relaxed,none,capped,mj,prevIds}=C;
 try{for(let d=days.length;d<n;d++){
  const meals=[],today=[];
  S.forEach((s,i)=>{
   const pool=MENUS.filter(m=>m.slot===s&&!hasEx(m,ex));
   const isM=s==='m',wantPref=isM&&pro!=='any'&&Math.floor((mj+1)*CONFIG.prefShare)>Math.floor(mj*CONFIG.prefShare);
   if(isM)mj++;
   if(!pool.length){meals.push(null);none++;return}
   // 예산은 하루 단위: 앞 끼니에서 쓰고 남은 예산을 남은 끼니 비율로 나눠 이번 끼니 한도로 씀 (아침을 싸게 먹으면 점심·저녁에 더 쓸 수 있음)
   const spent=meals.reduce((a,e)=>e?a+e.v.c:a,0),remW=w.slice(i).reduce((a,b)=>a+b,0);
   const naSpent=meals.reduce((a,e)=>e?a+e.v.na:a,0);
   const {rel,over,fit,cuPen,goalPen}=slotRules(A,T,i,(A.budget-spent)*w[i]/remW,(naMax(A)-naSpent)*w[i]/remW);
   const sc=m=>{
    let v=rel(m)*20+(use[m.id]||0)*2+(today.includes(m.id)?50:0)+(prevIds.includes(m.id)?2:0);
    v+=cuPen(m);
    v+=fit(m)+over(m)+goalPen(m);
    if(pro==='any'){if(isM)v+=1.5*(cat[m.pro]||0)}
    else if(isM)v+=wantPref?(proMatch(m,pro)?0:6):(proMatch(m,pro)?2:0);
    else if(proMatch(m,pro))v-=1;
    return v;
   };
   const scored=pool.map(m=>[sc(m),m]),min=Math.min(...scored.map(x=>x[0])),best=scored.filter(x=>x[0]===min).map(x=>x[1]);
   const m=best[(seed+d*3+i)%best.length];
   if(m.lvl>A.prep)relaxed++;
   use[m.id]=(use[m.id]||0)+1;if(isM)cat[m.pro]=(cat[m.pro]||0)+1;today.push(m.id);
   const raw=T.k*w[i]/mkv(m).k,x=clamp(raw,CONFIG.portion.min,CONFIG.portion.max);
   if(raw>CONFIG.portion.max)capped++;
   meals.push({m,x,v:mkv(m,x),slot:s});
  });
  prevIds=today;
  const tot=meals.reduce((a,e)=>e?addV(a,e.v):a,V0);
  days.push({d:CONFIG.days[d%7],meals,tot});
  C.snap.push({use:{...use},relaxed,none,capped});  // n일째까지의 누적값 (더 긴 계산이 캐시에 있어도 n일치 값을 돌려주려고)
 }}catch(e){planCache.delete(key);throw e}  // 계산 도중 오류가 나면 반쯤 바뀐 상태를 남기지 않음
 Object.assign(C,{relaxed,none,capped,mj,prevIds});
 const s=C.snap[n-1]||{use:{},relaxed:0,none:0,capped:0};
 return{T,ex,pro,days:days.slice(0,n),use:{...s.use},relaxed:s.relaxed,none:s.none,capped:s.capped};
}
/* 공통 안내 문구. avg는 하루 기준 값 */
function notesOf(P,avg,A,maxUse){
 const T=P.T,notes=[];
 if(P.none)notes.push('제외한 재료 때문에 메뉴를 고를 수 없는 끼니가 있어요. 시험 버전이라 메뉴 수가 적습니다.');
 if(P.relaxed)notes.push('조건에 맞는 메뉴가 부족해 선택한 요리 수준을 넘는 메뉴가 일부 포함됐어요.');
 if(maxUse>3)notes.push('메뉴 수가 적어 같은 메뉴가 여러 번 반복됩니다.');
 if(T.floored)notes.push('계산된 열량이 최소 기준보다 낮아 최소 기준으로 올려 계산했어요.');
 if(A.goal==='lose'&&A.basic.wt/Math.pow(A.basic.ht/100,2)<CONFIG.bmiNormalMax)notes.push('입력하신 키와 몸무게는 정상 체중 범위(BMI 18.5~22.9)예요. 체중 감량이 꼭 필요하지 않을 수 있으니 유지 목표도 함께 고려해 보세요.');
 if(A.goal==='lose'&&A.basic.ag>=CONFIG.oldAge)notes.push('65세 이상은 체중을 줄일 때 근육과 뼈도 함께 줄기 쉬워요. 천천히 감량하고, 단백질과 근력 운동을 함께 챙기세요. 감량을 시작하기 전에 의사와 상담하는 것을 권해요.');
 if(A.budget<1e9&&avg.c>A.budget)notes.push(budgetNote(A,T,avg,P.alt));
 const pn=proteinNote(T,avg,exList(A));if(pn)notes.push(pn);
 if(A.goal==='health'&&avg.na>naMax(A))notes.push(`오늘 식단은 식재료만으로도 나트륨이 하루 권고 기준(${num(naMax(A))}mg)을 넘어요. 조리할 때 넣는 소금·양념은 계산에 포함하지 않았으니 실제 섭취량은 더 많을 수 있어요.`);
 return notes;
}
/* 예산 초과 안내: 이유(준비 방식·목표 열량)와 예상 식비를 알려 주고, 준비 방식을 한 단계씩 올려 다시 계산해 예산 안에 들어오는 단계가 있으면 함께 알려 줌 */
const PREP_NAME={1:'조리 없이 차리는 식사',2:'전자레인지로 간단히 조리',3:'10~15분 간단한 요리',4:'30분 정도 일반적인 요리',5:'요리를 즐겨요'};
// 응답 수정 후에는 main.js가 첫 조합(seed 0)부터 다시 계산하므로 대안도 같은 결과를 확인함
function prepAlt(A){
 for(let p=A.prep+1;p<=5;p++){const D=planDays({...A,prep:p},0,1).days[0];if(D.tot.c<=A.budget)return{prep:p,cost:D.tot.c}}
 return 0;
}
function budgetNote(A,T,avg,alt){
 const head=A.prep<=2?`'${PREP_NAME[A.prep]}'로는 하루 ${num(A.budget)}원 안에 약 ${num(T.k)}kcal를 채우기 어려워`:`목표 열량(약 ${num(T.k)}kcal)이 높아 하루 ${num(A.budget)}원 안에 맞추기 어려워`;
 const tail=alt?` 응답 수정에서 준비 방식을 '${PREP_NAME[alt.prep]}'로 바꾸면 예상 식비는 약 ${num(won(alt.cost))}원으로 계산돼요.`:'';
 return`${head} 예상 식비가 약 ${num(won(avg.c))}원이에요.${tail}`;
}
/* 단백질 보충 안내: 하루 단백질이 목표보다 15% 넘게 모자랄 때만, 부족한 만큼을 채울 재료를 가격이 낮은 순으로 두 가지 알려 줌.
   제한 식품은 뺌. 한 번에 300g(달걀은 5개)을 넘는 양이 필요한 재료는 현실적이지 않아 제외 */
const PROT_ADD=['chicken','tuna','egg','edamame','natto','cottage','tofu','yog'],PROT_ADD_MAX=300,EGG_G=58;
function proteinNote(T,avg,ex){
 const gap=T.p-avg.p;
 if(!(avg.p<CONFIG.protNoteRatio*T.p))return'';
 const opts=PROT_ADD.map(id=>ING[id]?{id,I:ING[id]}:null).filter(o=>o&&!o.I.ex.some(t=>ex.includes(t))).map(o=>{
  const g=gap/o.I.p*100;return{id:o.id,g,cost:o.I.c*g/100}}).filter(o=>o.g<=PROT_ADD_MAX).sort((x,y)=>x.cost-y.cost).slice(0,2);
 const gp=Math.round(gap/5)*5,lead=`오늘 식단은 단백질이 목표보다 약 ${gp}g 부족해요.`;
 if(!opts.length)return`${lead} 하루 중 여러 번에 나눠 단백질 식품을 더해 보세요.`;
 const txt=opts.map(o=>o.id==='egg'?`달걀 ${Math.ceil(o.g/EGG_G-.05)}개`:`${ING[o.id].n} ${Math.ceil(o.g/10)*10}g`).join(' 또는 ');
 return`${lead} 간식이나 곁들임으로 ${txt}${txt.endsWith('개')?'를':'을'} 더하면 채울 수 있어요.`;
}
/* 하루 식단 (현재 화면에서 쓰는 결과). 같은 입력·seed면 같은 결과 */
function buildDay(A,seed=0){
 if(bmiBlock(A))return{blocked:true,msg:BMI_MSG};
 // seed번째 '바꾸기'는 내부적으로 seed+1일치를 짜고 마지막 날을 보여 줌 → 직전 조합과 겹치지 않게 반복 벌점이 적용됨
 const P=planDays(A,0,seed+1),D=P.days[seed];
 P.relaxed=D.meals.filter(e=>e&&e.m.lvl>A.prep).length;  // 보여 주는 날의 끼니만 셈
 if(A.budget<1e9&&D.tot.c>A.budget)P.alt=prepAlt(A);
 return{blocked:false,seed,T:P.T,ex:P.ex,pro:P.pro,meals:D.meals,tot:D.tot,notes:notesOf(P,D.tot,A,0),relaxed:P.relaxed,none:P.none,capped:P.capped};
}
/* 끼니 하나만 바꾸기: 나머지 두 끼는 그대로 두고 i번째 끼니만 다른 메뉴로 바꾼 결과를 돌려줌.
   seen: 이 끼니에 이미 보여 준 메뉴 id (다 보여 주면 처음부터 다시). 같은 입력·seen이면 같은 결과 */
function swapMeal(A,R,i,seen=[]){
 const T=R.T,ex=R.ex,pro=R.pro,s=CONFIG.slots[i];
 const cur=R.meals[i]&&R.meals[i].m,others=R.meals.filter((e,j)=>e&&j!==i).map(e=>e.m);
 // 이 끼니의 예산 한도 = 하루 예산 − 나머지 두 끼 식비
 const {isM,xOf,rel,over,fit,cuPen,goalPen}=slotRules(A,T,i,A.budget-R.meals.reduce((a,e,j)=>e&&j!==i?a+e.v.c:a,0),naMax(A)-R.meals.reduce((a,e,j)=>e&&j!==i?a+e.v.na:a,0));
 let pool=MENUS.filter(m=>m.slot===s&&!hasEx(m,ex)&&!others.some(o=>o.id===m.id)&&!(cur&&m.id===cur.id));
 if(!pool.length)return R;
 // 아직 안 보여 준 메뉴를 우선하되, 조건(요리 수준·예산)에 맞는 새 메뉴가 없으면 이미 보여 준 메뉴로 돌아감
 const relMin=a=>Math.min(...a.map(rel)),fresh=pool.filter(m=>!seen.includes(m.id));
 if(fresh.length&&relMin(fresh)<=relMin(pool))pool=fresh;
 // 선호 단백질 끼니였으면 계속 선호 단백질로, 아니었으면 지금 비율을 유지
 const keepPref=isM&&pro!=='any'&&cur&&proMatch(cur,pro);
 const sc=m=>{
  let v=rel(m)*20+cuPen(m)+fit(m)+over(m)+goalPen(m);
  if(pro==='any'){if(isM)v+=1.5*others.filter(o=>o.slot==='m'&&o.pro===m.pro).length}
  else if(isM)v+=keepPref?(proMatch(m,pro)?0:6):(proMatch(m,pro)?2:0);
  else if(proMatch(m,pro))v-=1;
  return v;
 };
 const scored=pool.map(m=>[sc(m),m]),min=Math.min(...scored.map(x=>x[0])),best=scored.filter(x=>x[0]===min).map(x=>x[1]);
 const m=best[seen.length%best.length],x=xOf(m);
 const meals=R.meals.map((e,j)=>j===i?{m,x,v:mkv(m,x),slot:s}:e);
 const tot=meals.reduce((a,e)=>e?addV(a,e.v):a,V0);
 const relaxed=meals.filter(e=>e&&e.m.lvl>A.prep).length,alt=A.budget<1e9&&tot.c>A.budget?prepAlt(A):undefined;  // 응답 수정 후 실제로 생성될 첫 조합 기준의 준비 방식·예상 식비
 return{...R,meals,tot,relaxed,notes:notesOf({T,none:R.none,relaxed,alt},tot,A,0)};
}
/* 7일 식단 (정적 페이지·향후 구독용으로 보존) */
function buildWeek(A,seed=0){
 if(bmiBlock(A))return{blocked:true,msg:BMI_MSG};
 const P=planDays(A,seed,7),{T,days}=P;
 const sum=days.reduce((a,D)=>addV(a,D.tot),V0);
 const avg={k:sum.k/7,p:sum.p/7,f:sum.f/7,cb:sum.cb/7,c:sum.c/7},gl={};
 days.forEach(D=>D.meals.forEach(e=>e&&e.m.items.forEach(([i,g])=>gl[i]=(gl[i]||0)+g*e.x)));
 const grocery=Object.entries(gl).map(([i,g])=>[i,Math.round(g/10)*10]).sort((a,b)=>ING[b[0]].c*b[1]-ING[a[0]].c*a[1]);
 const maxUse=Math.max(0,...Object.values(P.use));
 return{blocked:false,T,days,avg,total:sum,grocery,notes:notesOf(P,avg,A,maxUse),pro:P.pro,maxUse,relaxed:P.relaxed,none:P.none,capped:P.capped};
}
/* ============ 6. 출력용 HTML 조각 (순수 함수 — 정적 페이지 생성에도 재사용) ============ */
const gtxt=(id,g)=>`${ING[id].n} ${g}g`;
function weekTableHTML(W){
 return `<div class="tw"><table class="wk"><thead><tr><th>요일</th><th>아침</th><th>점심</th><th>저녁</th></tr></thead><tbody>${W.days.map(D=>`<tr><td>${D.d}</td>${D.meals.map(e=>`<td>${e?e.m.name:'-'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function dayDetailHTML(W){
 return W.days.map(D=>`<details class="dd"><summary>${D.d}요일 · ${num(D.tot.k)} kcal · 단백질 ${num(D.tot.p)}g · 약 ${num(won(D.tot.c))}원</summary>${D.meals.map((e,i)=>e?`<div class="mb2"><div class="s">${CONFIG.slotName[i]}</div><b>${e.m.name}</b><div class="tags">${e.m.items.map(([id,g])=>`<span>${gtxt(id,Math.round(g*e.x/5)*5)}</span>`).join('')}</div><p class="note" style="margin:0">${num(e.v.k)} kcal · 단백질 ${num(e.v.p)}g · 약 ${num(won(e.v.c))}원</p></div>`:`<p class="mut">${CONFIG.slotName[i]}: 조건에 맞는 메뉴가 없습니다.</p>`).join('')}</details>`).join('');
}
/* 오늘 장보기 목록: 세 끼 재료를 합산(카드 '분량 보기'와 같은 5g 단위 값끼리 더함). 집에 있을 법한 기본 재료(PANTRY)는 따로 묶음 */
const PANTRY=new Set(['brice','oil','sesoil','periloil','soy','doen','gochu','ssam','perillap','sesame','fishsauce','garlic']);
function groceryBoxHTML(R){
 const g={},sea=[];
 R.meals.forEach(e=>{if(!e)return;e.m.items.forEach(([id,q])=>{g[id]=(g[id]||0)+Math.round(q*e.x/5)*5});(e.m.sea||[]).forEach(t=>{if(t!=='찬물'&&!sea.includes(t))sea.push(t)})});
 const rows=Object.entries(g),row=([id,q])=>`<li><label><input type="checkbox" data-id="${id}"><span>${ING[id].n}</span><b>${q}g</b></label></li>`;
 const buy=rows.filter(([i])=>!PANTRY.has(i)),pan=rows.filter(([i])=>PANTRY.has(i));
 return`<section class="box gl"><div class="gh"><div><h3>오늘의 장보기</h3><p class="gi">이미 있는 재료는 체크해서 지워 가세요. 남은 항목이 오늘 사야 할 재료예요.<span>적힌 양은 오늘 세 끼 기준이에요. 마트에서는 포장 단위로 팔아서 이보다 더 사야 할 수 있어요.</span></p></div><p class="gc" id="gcnt" aria-live="polite"></p></div>
  <ul class="buy">${buy.map(row).join('')}</ul>
  ${pan.length||sea.length?`<h4>집에 있을 법한 기본 재료</h4>${pan.length?`<ul>${pan.map(row).join('')}</ul>`:''}${sea.length?`<p class="sea">양념은 적당량: ${sea.join(', ')}</p>`:''}`:''}</section>`;
}
/* 하루 식단 결과 화면 */
const GOAL_LABEL={lose:'체중 감량',gain:'근육량 증가',keep:'체중 유지',energy:'활력 충전',health:'식습관 교정',perf:'운동 퍼포먼스 향상'};
const CHK='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
 CHEV='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
const SWP='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/></svg>';
const short=id=>ING[id].n.replace(/\(.*?\)/g,'');
const ICON={
 leaf:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
 spark:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.13-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.13a.5.5 0 0 1 .96 0l1.58 6.13a2 2 0 0 0 1.44 1.44l6.13 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.13a.5.5 0 0 1-.96 0z"/><path d="M20 3v4M22 5h-4"/></svg>',
 pie:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>',
 loop:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/></svg>',
 dish:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>'
};
function mealCardHTML(e,i,swap){
 const slot=CONFIG.slotName[i];
 if(!e)return`<article class="card em"><p>${slot}: 조건에 맞는 메뉴가 없습니다.</p></article>`;
 const m=e.m,img=`<div class="im">${m.img?`<img src="${m.img}" alt="" loading="lazy">`:''}</div>`;  // 사진이 없어도 자리는 남김
 return`<article class="card">${img}<div class="cb"><div class="ct"><span>${slot}</span>${swap?`<button class="swp" data-swap="${i}" aria-label="${slot} 메뉴만 바꾸기">${SWP}바꾸기</button>`:''}</div><h3>${m.name}</h3><p class="ds">${(m.desc||'').replace(/\.$/,'')}</p>
 <div class="ft"><div class="tags">${m.items.map(([id])=>`<span>${short(id)}</span>`).join('')}</div>
 <div class="dt"><details><summary>분량 보기</summary><ul>${m.items.map(([id,g])=>`<li>${gtxt(id,Math.round(g*e.x/5)*5)}</li>`).join('')}${m.sea&&m.sea.length?`<li>양념: ${m.sea.join(', ')} (적당량)</li>`:''}</ul></details><details class="nu"><summary>영양성분 보기</summary><dl><dt>열량</dt><dd>${num(e.v.k)} kcal</dd><dt>단백질</dt><dd>${num(e.v.p)}g</dd><dt>탄수화물</dt><dd>${num(e.v.cb)}g</dd><dt>지방</dt><dd>${num(e.v.f)}g</dd></dl></details></div></div></div></article>`;
}
/* 홈 예시 결과: 요약 막대 + 세 끼 카드. 선택한 답변 문구는 순번(sel)이 있으면 그걸, 없으면 값으로 찾음 */
const optLabel=(id,A)=>{const o=QUESTIONS.find(q=>q.id===id).o,i=A.sel&&A.sel[id];return(i!=null&&o[i]?o[i]:o.find(x=>x[0]===A[id])||['',''])[1]};
function planHTML(R,A,swap){
 const t=R.tot,cell=(l,v)=>`<div><span>${l}</span><b>${v}</b></div>`;
 return`<div class="sumt"><div><span class="si">${ICON.dish}</span><div><span>오늘 식단의 영양소</span><b>${num(t.k)} kcal</b><small class="mac"><span>단백질 <i>${num(t.p)}g</i></span><span>탄수화물 <i>${num(t.cb)}g</i></span><span>지방 <i>${num(t.f)}g</i></span></small></div></div>
 ${cell('나의 목표',GOAL_LABEL[A.goal])}${cell('준비 방식',optLabel('prep',A))}${cell('음식 취향',optLabel('cu',A).replace(/[을를] 선호해요$/,' 선호'))}${cell('하루 식비',`약 ${num(won(t.c))}원`)}</div>
 <div class="cards">${R.meals.map((e,i)=>mealCardHTML(e,i,swap)).join('')}</div>`;
}
function dayResultHTML(R,A){
 return`<div class="rh"><div><p class="eb">YOUR TABLE, YOUR RHYTHM</p><h2>나를 위한 오늘의 식단</h2><p class="stat">목표 약 ${num(R.T.k)} kcal · 단백질 ${num(R.T.p)}g</p></div><button class="tl bk" id="re"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> 응답 수정</button></div>
 ${planHTML(R,A,true)}
 ${R.ex.length?`<p class="note" style="margin:6px 0 0">· ${R.ex.join('·')} 재료는 뺐어요.</p>`:''}
 ${R.notes.map(t=>`<p class="note" style="margin:6px 0 0">· ${t}</p>`).join('')}
 ${groceryBoxHTML(R)}
 <div class="foot"><div class="bs"><button class="tl" id="sh"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/></svg> 세 끼 모두 바꾸기</button></div></div>
 <p class="disc">이 식단은 일반적인 식사 아이디어이며 의료·영양 상담을 대신하지 않아요. 알레르기, 질환, 임신·수유 등 특별한 고려가 필요하다면 전문가와 상담하고 식품 표시를 확인해 주세요. 시험 버전: 재료 가격은 2026년 10월 전국 평균 소매가 기준이며 일부는 추정치입니다.</p>`;
}

