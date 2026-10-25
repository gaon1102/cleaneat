/* CleanEat — 데이터: 계산 설정값(CONFIG), 질문 문구(QUESTIONS), 재료 영양·가격(ING), 메뉴(MENUS).
   문구·메뉴·재료 값을 고칠 때 여는 파일. index.html에서 engine.js·main.js보다 먼저 불러옴 */
/* ============ 1. 설정값 (안전·계산 기준) — 공신력 있는 출처로 확인 후 수정 ============ */
const CONFIG={
 minAge:18, bmiMin:18.5, bmiNormalMax:23,         // BMI 18.5 미만 감량은 차단, 18.5~22.9(정상) 감량은 안내만. 대한비만학회 기준(저체중 <18.5, 정상 18.5~22.9, 비만 전단계 23~24.9)
 kcalFloor:{m:1500,f:1200},                      // 하루 최소 열량. 2013 AHA/ACC/TOS 비만 가이드라인의 감량 식단 처방 범위(여 1,200~1,500 / 남 1,500~1,800kcal) 하한. 800kcal 미만 초저열량식은 의료 감독이 필요
 goalMul:{lose:.85,gain:1.1,keep:1,energy:1,health:1,perf:1.05},   // 목표별 열량 배수 (perf는 이전 선택지, 지금은 안 씀)
 protPerKg:{lose:1.6,gain:1.8,keep:1.2,energy:1.2,health:1.2,perf:1.6},// 목표별 단백질 g/kg — energy·health는 근거 있는 별도 기준이 없어 유지(keep)와 같게 둠
 activity:[1.4,1.5,1.6,1.7,1.8],                    // 주간 활동 선택지 순서대로 (가벼운 활동 ~ 매일). 기초대사량(Mifflin-St Jeor)에 곱함. 미국 국립아카데미 2023 에너지 섭취기준의 PAL 분류(비활동 대표 1.4, 저활동 1.6, 활동 1.75)에 맞춰 2026-10-26 조정 (이전 1.2~1.9)
 slots:['a','m','m'], split:[.25,.375,.375],     // 하루 3끼 고정: 아침, 점심, 저녁
 splitBy:{energy:[.30,.35,.35]},                 // 목표별 끼니 비율. 활력 목표는 아침을 조금 더 든든하게(디자인 선택, 효과 근거는 약함)
 balance:{p:[.10,.20],f:[.15,.30],cb:[.50,.65],w:20},  // 유지 목표: 열량 중 단백질·지방·탄수화물 비율 범위(2025 한국인 영양소 섭취기준 에너지적정비율). 벗어난 정도 1.0당 w점
 energy:{veg:130,vegW:4,fatMax:.30,fatW:20},          // 활력 목표: 끼니당 채소·과일 g(WHO 하루 400g의 1/3), 메뉴 지방 비율 상한
 slotName:['아침','점심','저녁'], days:['월','화','수','목','금','토','일'],
 portion:{min:.5,max:2},                         // 메뉴 기본 분량 대비 배수 범위
 prefShare:.6,                                   // 선호 단백질 메뉴를 쓰는 점심·저녁 비율
 cuPenalty:{a:2,m:4},                            // 선호 음식 스타일이 아닐 때 벌점 (아침은 약하게)
 prepOverBudget:1.5,                          // 메뉴 고를 때 요리 수준 1단계 초과 벌점 = 예산 초과 벌점의 1.5배
 overCost:8,                                   // 예산을 넘는 메뉴끼리 비교할 때의 추가 벌점: 끼니 몫을 100% 넘으면 이 점수 (요리 수준 1단계 초과 30점보다 작게)
 protNoteRatio:.85,                            // 하루 단백질이 목표의 이 비율 미만이면 보충 안내를 보여 줌
 fit:{kcal:6,prot:15}                                  // prot: 끼니 단백질 목표 대비 부족 비율 1.0(=전부 부족)당 벌점. 부족한 만큼 비례해서 깎음
};
/* 홈 화면 '예시 결과'에 쓰는 입력값 (실제 계산 엔진으로 만들어 보여줌). 바꾸면 예시도 바뀜 */
const EXAMPLE={basic:{sx:'f',ag:29,ht:163,wt:58},goal:'keep',act:2,excl:[],pro:'any',cu:'any',prep:3,budget:20000,sel:{}};
/* 음식 취향 '지중해식'으로 고를 때 우선하는 메뉴 (올리브유·생선·콩·통곡물·채소 중심, 장류·아시아 양념 제외). 메뉴를 추가하면 여기에도 넣어 주세요 */
const MED_IDS=new Set(['a3','a4','a6','a14','R79','R82','R115','c1','c2','c3','c5','m2','f1','f2','f5','f6','f7','f8','m3','m13','s1','s3','s4','s5','s6','s12','e2','e4','e5','R51','R94','R100','R101','R105','R107','R112','R116','R118','R119','R122','L1','L3','L7','L8','L9','L10','L11','L12','L19','L32','L33','L35','L37','N1','N3','N5','N6','N7','N8']);
const PRESET={veg:['육류','해산물'],vegan:['육류','해산물','달걀','유제품']};
const PRO_LABEL={meat:'육류',chicken:'닭고기',red:'소고기·돼지고기',egg:'달걀·유제품',soy:'두부·콩',fish:'생선·해산물',none:'기타',any:'다양하게'};
/* ============ 2. 질문 (기본 정보 다음 단계) — 순서: 목표 → 활동 → 제한 식품 → 선호 단백질 → 음식 스타일 → 준비 방식 → 예산 ============ */
const QUESTIONS=[
 {id:'goal',l:'나의 목표',t:'이번 식단에서 바라는 건 무엇인가요?',h:'나에게 더 가까운 목표 하나를 골라주세요.',o:[['lose','체중 감량 및 체지방 감소','무리 없이 천천히 줄여가는 식단을 원해요'],['gain','근육량 증가 및 체력 증진','단백질과 탄수화물을 챙기는 식단을 원해요'],['keep','현재 체중 및 체형 유지','지금의 균형을 꾸준히 이어가고 싶어요'],['energy','일상 활력 충전 및 규칙적인 식사','속 편하고 든든하게 하루를 보내고 싶어요'],['health','식습관 교정 및 건강 관리','덜 가공된 음식으로 식습관을 바로잡고 싶어요']]},
 {id:'act',l:'주간 활동',t:'평소 일주일에 얼마나 움직이나요?',h:'운동뿐 아니라 산책처럼 일상에서 하는 활동도 떠올려 보세요.',o:[[0,'가벼운 활동','산책이나 스트레칭 위주'],[1,'주 1~2회','가끔 시간을 내서 운동해요'],[2,'주 3~4회','규칙적으로 몸을 움직여요'],[3,'주 5~6회','활동량이 많은 편이에요'],[4,'매일','매일 땀 흘릴 만큼 운동해요']]},
 {id:'excl',l:'제한 식품',multi:1,t:'못 먹거나 피해야 하는 음식이 있나요?',h:'알레르기나 개인적인 이유로 피하는 식품을 모두 선택해주세요.',note:'선택하지 않아도 다음으로 넘어갈 수 있어요.',warn:'실제 알레르기가 있다면 모든 재료와 조리 도구의 교차 접촉 여부를 꼭 확인해 주세요. 이 목록에 없는 밀·메밀·대두 등은 걸러지지 않아요.',o:[['유제품','유제품','우유, 치즈, 요거트 등'],['견과류','견과류','호두, 땅콩, 아몬드 등'],['해산물','해산물','생선, 새우, 오징어 등'],['달걀','달걀','달걀이 들어간 요리 전체'],['육류','육류','닭·소·돼지고기']]},
 {id:'pro',l:'선호 단백질',t:'어떤 단백질 식품을 가장 선호하나요?',h:'평소 즐겨 먹거나 좋아하는 단백질 식품을 떠올려 보세요.',o:[['meat','육류','닭고기, 소고기, 돼지고기 등'],['egg','달걀·유제품','달걀, 그릭요거트 등'],['fish','생선·해산물','연어, 고등어, 새우 등'],['soy','두부·콩','두부, 콩, 낫토 등'],['any','다양하게 먹고 싶어요','한 가지에 치우치지 않게']]},
 {id:'cu',l:'음식 취향',t:'어떤 스타일의 음식을 가장 선호하나요?',h:'내 취향에 가까운 음식 스타일을 선택해 주세요.',o:[['kr','한식 위주','밥, 국, 찌개 등'],['west','양식 위주','샐러드, 파스타, 수프 등'],['med','지중해식','올리브유, 생선, 채소 등'],['world','다양한 세계 음식','일식, 중식, 동남아, 인도식 등'],['any','상관 없음','가리지 않고 다양하게']]},
 {id:'prep',l:'준비 방식',t:'평소 어느 정도까지 요리할 수 있나요?',h:'가장 가까운 항목 하나를 선택해 주세요.',o:[[1,'조리 없이 차리는 식사','썰고 담고 섞기만 하면 돼요'],[2,'전자레인지로 간단히 조리','데우거나 간단하게 익히기'],[3,'10~15분 간단한 요리','달걀, 볶음밥 등'],[4,'30분 정도 일반적인 요리','여러 재료 활용'],[5,'요리를 즐겨요','새로운 레시피도 괜찮아요']]},
 {id:'budget',l:'하루 예산',t:'하루 식비는 어느 정도가 편한가요?',h:'식재료를 선택할 때 참고할 하루 전체 예산을 골라주세요.',o:[[10000,'10,000원 이하','하루 식비 기준으로 알뜰하게'],[15000,'10,000~15,000원','부담 없이 균형 있게'],[20000,'15,000~20,000원','재료 선택을 조금 더 넓게'],[25000,'20,000~25,000원','다양한 재료를 두루 활용'],[1e9,'제한 없음','가격보다 메뉴를 우선해요']]}
];
/* ============ 3. 재료 (100g당, 조리 전 먹는 부분 무게. 곡물·콩은 마른 무게, 통조림은 물기 뺀 무게)
   k 열량, p 단백질(g), f 지방(g), cb 탄수화물(g): 식약처 식품영양성분 DB(공공데이터포털 표준데이터, 2026-10-25 내려받음) 원재료성 항목 → 가공식품 같은 품목 중앙값 → USDA FoodData Central 순.
   재료별 출처·식품코드는 프로젝트의 ING_MATCHING.csv. curryp·tofunoodle은 DB에 맞는 항목이 없어 추정값.
   c 가격(원/100g, 먹는 부분 기준). KAMIS 소매가(2026년 연평균, 축산물은 2026-10-24)와 참가격(2026-09)을 폐기율로 보정. 값을 못 구한 재료는 추정치 ============ */
/* 채소·과일로 셀 재료 (활력 목표의 끼니당 채소·과일 양 계산용). WHO 기준처럼 감자·고구마 같은 전분 뿌리채소와 곡물·콩은 뺌. 재료를 추가하면 여기에도 넣어 주세요 */
const VEG_FRUIT=new Set(['broc','spin','sprout','mush','shiitake','cabbage','lettuce','tomato','tomatocan','cuc','zuc','eggplant','paprika','onion','carrot','scallion','beet','radish','asparagus','seaweed','kimchi','pumpkin','bokchoy','mungsprout','fern','gondre','celery','cauli','kale','chive','banana','apple','kiwi','blueberry','avo','strawberry']);
/* 배추김치는 젓갈이 들어갈 수 있어 해산물 제외 태그를 붙임(비건 김치는 제품 확인) */
const ING={
 /* 육류 */
 chicken:{n:'닭가슴살',k:106,p:22.97,f:0.97,cb:0,c:1300,ex:['육류']},thigh:{n:'닭다리살(껍질 제거)',k:121,p:19.7,f:4.12,cb:0,c:1100,ex:['육류']},tender:{n:'닭안심',k:106,p:22.97,f:0.97,cb:0,c:1400,ex:['육류']},turkey:{n:'칠면조 가슴살',k:144,p:21.64,f:5.64,cb:0.13,c:3000,ex:['육류']},
 beef:{n:'소고기 우둔살(수입산)',k:116,p:23.6,f:2.45,cb:0,c:3500,ex:['육류']},mince:{n:'소고기 다짐육(수입산 우둔)',k:116,p:23.6,f:2.45,cb:0,c:2800,ex:['육류']},pork:{n:'돼지 안심',k:123,p:22.21,f:3.15,cb:0,c:1500,ex:['육류']},porkleg:{n:'돼지 뒷다리살',k:135,p:20.88,f:4.97,cb:0,c:1670,ex:['육류']},
 /* 해산물 */
 salmon:{n:'연어(양식)',k:273,p:18.58,f:20.71,cb:0,c:6133,ex:['해산물']},mack:{n:'고등어',k:183,p:20.2,f:10.4,cb:0,c:1665,ex:['해산물']},samchi:{n:'삼치',k:124,p:20.08,f:2.93,cb:0,c:2397,ex:['해산물']},cod:{n:'대구',k:87.5,p:19.7,f:0.6,cb:0,c:1800,ex:['해산물']},
 tuna:{n:'참치 통조림',k:197,p:23,f:10.63,cb:0,c:1887,ex:['해산물']},shrimp:{n:'새우살',k:109,p:21.17,f:0.89,cb:0,c:3142,ex:['해산물']},squid:{n:'오징어',k:85,p:17.1,f:1.12,cb:0.5,c:2176,ex:['해산물']},
 /* 달걀·콩 */
 egg:{n:'달걀',k:136,p:12.91,f:8.25,cb:0.79,c:389,ex:['달걀']},tofu:{n:'두부',k:90,p:8,f:4.8,cb:3,c:844,ex:[]},softtofu:{n:'순두부',k:61,p:5.5,f:2.8,cb:2.8,c:300,ex:[]},natto:{n:'낫토',k:191,p:14.5,f:8.3,cb:14,c:1500,ex:[]},edamame:{n:'냉동 에다마메',k:121,p:11.9,f:5.2,cb:8.91,c:1500,ex:[]},
 lentil:{n:'렌틸콩(건)',k:359,p:21.01,f:1.43,cb:65.42,c:800,ex:[]},chickpea:{n:'병아리콩(건)',k:373,p:17.27,f:5.66,cb:63.14,c:700,ex:[]},chickcan:{n:'병아리콩 통조림(물기 뺀)',k:183,p:9.18,f:3.2,cb:29.24,c:800,ex:[]},whitebean:{n:'흰강낭콩(건)',k:350,p:21.2,f:1.1,cb:63.9,c:900,ex:[]},soymilk:{n:'무가당 두유',k:39.5,p:2.7,f:1.7,cb:2.5,c:438,ex:[]},
 /* 유제품 */
 yog:{n:'그릭요거트',k:141,p:7.4,f:7.7,cb:10.3,c:1200,ex:['유제품']},cottage:{n:'코티지치즈',k:98,p:11.1,f:4.3,cb:3.38,c:2000,ex:['유제품']},ricotta:{n:'리코타치즈',k:150,p:7.54,f:10.2,cb:7.27,c:2500,ex:['유제품']},mozz:{n:'모차렐라치즈',k:289,p:21,f:20,cb:1.4,c:2500,ex:['유제품']},parm:{n:'파마산치즈',k:398,p:32,f:30,cb:0,c:4000,ex:['유제품']},milk:{n:'우유',k:67,p:3.09,f:3.85,cb:4.86,c:288,ex:['유제품']},
 /* 곡물·면·빵 */
 brice:{n:'현미(건)',k:357,p:7.33,f:2.23,cb:75.92,c:498,ex:[]},quinoa:{n:'퀴노아(건)',k:368,p:14.1,f:6.07,cb:64.2,c:2000,ex:[]},oat:{n:'오트밀',k:371,p:13.41,f:3.69,cb:70,c:700,ex:[]},granola:{n:'저당 그래놀라',k:470,p:14.1,f:19.2,cb:59,c:1500,ex:['견과류']},
 bread:{n:'통밀빵',k:268,p:9.6,f:5,cb:46.8,c:800,ex:[]},tortilla:{n:'통밀 또띠아',k:295,p:8.8,f:7.3,cb:47.4,c:1500,ex:[]},pasta:{n:'통밀 파스타(건)',k:325,p:13,f:2.5,cb:64,c:636,ex:[]},soba:{n:'메밀면(건)',k:336,p:14.4,f:0.71,cb:74.6,c:1000,ex:[]},ricenoodle:{n:'쌀국수(건)',k:340,p:5.2,f:1,cb:75,c:1000,ex:[]},
 sweet:{n:'고구마',k:147,p:1.09,f:0.15,cb:35.52,c:579,ex:[]},potato:{n:'감자',k:70,p:1.93,f:0.03,cb:16.07,c:410,ex:[]},pumpkin:{n:'단호박',k:57,p:1.19,f:0.65,cb:13.63,c:500,ex:[]},
 /* 채소·버섯·해조 */
 broc:{n:'브로콜리',k:32,p:3.08,f:0.2,cb:6.32,c:913,ex:[]},spin:{n:'시금치',k:29,p:3.35,f:0.39,cb:4.86,c:1214,ex:[]},sprout:{n:'콩나물',k:43,p:4.66,f:1.19,cb:3.44,c:732,ex:[]},mush:{n:'양송이버섯',k:15,p:3.12,f:0.23,cb:3.89,c:2790,ex:[]},shiitake:{n:'표고버섯',k:22,p:2.74,f:0.38,cb:7.38,c:1500,ex:[]},
 cabbage:{n:'양배추',k:29,p:1.36,f:0.12,cb:6.98,c:245,ex:[]},lettuce:{n:'로메인·상추',k:17.5,p:1.97,f:0.27,cb:2.92,c:1221,ex:[]},tomato:{n:'토마토',k:19,p:1.03,f:0.18,cb:4.26,c:513,ex:[]},tomatocan:{n:'무가당 토마토 통조림',k:20,p:1.2,f:0.1,cb:3.4,c:500,ex:[]},
 cuc:{n:'오이',k:14,p:1.22,f:0.02,cb:3.05,c:439,ex:[]},zuc:{n:'애호박(주키니)',k:22,p:1.07,f:0.09,cb:5.14,c:551,ex:[]},eggplant:{n:'가지',k:19,p:1.13,f:0.03,cb:4.36,c:546,ex:[]},paprika:{n:'파프리카',k:25,p:0.84,f:0.12,cb:6.19,c:1024,ex:[]},
 onion:{n:'양파',k:29,p:0.96,f:0.17,cb:6.52,c:220,ex:[]},carrot:{n:'당근',k:31,p:1.02,f:0.13,cb:7.03,c:358,ex:[]},garlic:{n:'마늘',k:128,p:7.45,f:0.16,cb:26.42,c:1303,ex:[]},scallion:{n:'대파',k:23,p:1.78,f:0.15,cb:4.8,c:404,ex:[]},
 beet:{n:'비트',k:26,p:1.56,f:0.14,cb:5.26,c:800,ex:[]},radish:{n:'무',k:21,p:0.77,f:0.15,cb:4.72,c:155,ex:[]},asparagus:{n:'아스파라거스',k:17,p:2.02,f:0.34,cb:2.53,c:2500,ex:[]},seaweed:{n:'불린 미역',k:14,p:1.96,f:0.18,cb:4.45,c:302,ex:[]},kimchi:{n:'배추김치',k:39,p:2,f:0.4,cb:6.7,c:1067,ex:['해산물']},
 lemon:{n:'레몬',k:36,p:0.71,f:0.08,cb:9.27,c:1401,ex:[]},basil:{n:'바질',k:32,p:2.43,f:0.71,cb:5.56,c:5000,ex:[]},
 /* 과일 */
 banana:{n:'바나나',k:77,p:1.11,f:0.2,cb:20,c:625,ex:[]},apple:{n:'사과',k:57,p:0.2,f:0.66,cb:14.11,c:911,ex:[]},kiwi:{n:'키위',k:66,p:0.93,f:0.63,cb:16.08,c:1324,ex:[]},blueberry:{n:'냉동 블루베리',k:41,p:0.81,f:0.26,cb:10.07,c:1139,ex:[]},avo:{n:'아보카도',k:160,p:2,f:14.66,cb:8.53,c:1374,ex:[]},
 /* 지방·견과·씨앗 */
 walnut:{n:'호두',k:688,p:15.47,f:71.99,cb:7.92,c:2050,ex:['견과류']},pnut:{n:'땅콩버터(무가당)',k:610,p:25.5,f:49,cb:21,c:1500,ex:['견과류']},chia:{n:'치아시드',k:486,p:16.54,f:30.74,cb:42.12,c:2500,ex:[]},sesame:{n:'참깨',k:557,p:25.96,f:45.11,cb:21.83,c:2510,ex:[]},
 tahini:{n:'타히니(참깨 페이스트)',k:595,p:17,f:53.8,cb:21.2,c:3000,ex:[]},pesto:{n:'바질 페스토',k:380.5,p:6,f:35.5,cb:9.8,c:3000,ex:['유제품','견과류']},oil:{n:'올리브유',k:921,p:0,f:100,cb:0,c:2000,ex:[]},sesoil:{n:'참기름',k:920,p:0,f:99.84,cb:0.13,c:3993,ex:[]},
 /* 양념 */
 soy:{n:'간장',k:34.5,p:5,f:0.1,cb:3.5,c:769,ex:[]},doen:{n:'된장',k:165,p:12,f:4.3,cb:19.6,c:814,ex:[]},gochu:{n:'고추장',k:221,p:5.9,f:2,cb:45,c:1656,ex:[]},
 /* 추가 재료 */

 pollock:{n:'명태(코다리)',k:76,p:16.58,f:0.58,cb:0.17,c:718,ex:['해산물']},bugeo:{n:'북어채',k:372,p:82.7,f:2.4,cb:0,c:6000,ex:['해산물']},tunaraw:{n:'냉동 참치회',k:104,p:23.4,f:1,cb:0,c:4000,ex:['해산물']},
 perillap:{n:'들깻가루',k:530,p:23.59,f:36.23,cb:35.53,c:2500,ex:[]},periloil:{n:'들기름',k:920,p:0,f:99.92,cb:0.08,c:3500,ex:[]},cheong:{n:'청국장',k:203,p:19.9,f:4,cb:19.8,c:1000,ex:[]},
 coco:{n:'코코넛밀크',k:197,p:2.02,f:21.3,cb:2.81,c:800,ex:[]},curryp:{n:'레드커리 페이스트',k:100,p:2,f:4,cb:10,c:3000,ex:['해산물']},ssam:{n:'쌈장',k:195,p:9.7,f:3.1,cb:28.9,c:1232,ex:[]},
 tofunoodle:{n:'두부면',k:95,p:10,f:5,cb:4,c:1200,ex:[]},wflour:{n:'통밀가루',k:347,p:13.73,f:2.2,cb:73.77,c:376,ex:[]},ricepaper:{n:'라이스페이퍼',k:343,p:0.9,f:0.5,cb:83.3,c:2000,ex:[]},
 bokchoy:{n:'청경채',k:10,p:1.41,f:0.09,cb:1.64,c:800,ex:[]},mungsprout:{n:'숙주',k:13,p:1.73,f:0.05,cb:2.34,c:400,ex:[]},fern:{n:'삶은 고사리',k:21,p:2.74,f:0.24,cb:3.55,c:1500,ex:[]},gondre:{n:'삶은 곤드레',k:40,p:3.8,f:0.92,cb:6.32,c:2000,ex:[]},gim:{n:'구운 김',k:190.5,p:41.44,f:1.67,cb:45.11,c:9933,ex:[]},
 /* 사용자 DB에서 추가한 재료 */

 konjac:{n:'곤약면',k:7,p:0.08,f:0.01,cb:3.18,c:600,ex:[]},tempeh:{n:'템페',k:192,p:20.3,f:10.8,cb:7.64,c:3000,ex:[]},smsalmon:{n:'훈제 연어',k:174,p:21.8,f:8.2,cb:1.2,c:7933,ex:['해산물']},
 blackbean:{n:'블랙빈(검은 강낭콩, 삶은 것)',k:132,p:8.86,f:0.54,cb:23.7,c:900,ex:[]},kidney:{n:'강낭콩(삶은 것)',k:169,p:10.35,f:0.93,cb:29.43,c:900,ex:[]},peas:{n:'완두콩',k:114,p:7.92,f:0.44,cb:19.51,c:800,ex:[]},
 corn:{n:'옥수수 알갱이',k:75,p:2,f:1.2,cb:13.9,c:600,ex:[]},celery:{n:'셀러리',k:17,p:1.04,f:0.07,cb:3.95,c:800,ex:[]},cauli:{n:'콜리플라워',k:27,p:2.17,f:0.48,cb:4.84,c:1000,ex:[]},kale:{n:'케일',k:26,p:3.11,f:0.24,cb:4.61,c:2000,ex:[]},
 chive:{n:'부추',k:22,p:1.8,f:0.3,cb:4.1,c:790,ex:[]},strawberry:{n:'딸기',k:34,p:0.74,f:0.14,cb:8.33,c:1626,ex:[]},pseed:{n:'호박씨',k:548,p:35.35,f:48.18,cb:5.34,c:3000,ex:[]},hemp:{n:'햄프시드',k:553,p:31.6,f:48.8,cb:8.67,c:4000,ex:[]},
 hummus:{n:'후무스',k:233.5,p:6.6,f:15.1,cb:18.6,c:2000,ex:[]},dumpwrap:{n:'만두피',k:291,p:9.8,f:1.5,cb:57.9,c:1000,ex:[]},barley:{n:'보리(건)',k:341,p:8.66,f:1.66,cb:75.04,c:500,ex:[]},
 plainyog:{n:'플레인 요거트',k:80.5,p:3.2,f:2.8,cb:11,c:1171,ex:['유제품']},fishsauce:{n:'액젓',k:32.5,p:6.89,f:0.18,cb:0.2,c:620,ex:['해산물']},
 /* 조리 수준 1~2단계용 재료 (2026-10-25 추가) */
 rtchicken:{n:'닭가슴살(시판 조리 제품, 저염)',k:117,p:20,f:1.7,cb:4,c:2000,ex:['육류']},ricepack:{n:'즉석 현미밥',k:166,p:3.47,f:0.96,cb:35.34,c:625,ex:[]},
 boilegg:{n:'삶은 달걀(시판 구운 달걀 가능)',k:145,p:13.49,f:8.69,cb:1.37,c:900,ex:['달걀']},silken:{n:'연두부',k:55,p:4.8,f:2.9,cb:2.3,c:500,ex:[]},
 couscous:{n:'통밀 쿠스쿠스(건)',k:376,p:12.8,f:0.64,cb:77.4,c:1500,ex:[]}
};
/* ============ 4. 메뉴 — slot: a 아침 / m 점심·저녁 / s 간식(현재 미사용), lvl: 조리 난이도 1~5, pro: 주 단백질 유형(chicken·red·egg·soy·fish·none), cu: 음식 스타일(kr 한식·west 양식·world 세계), img: 사진 주소, desc: 카드 설명 한 줄, sea: 양념(표시용, 계산 안 함) ============
   영양값은 식약처 DB 기준(재료 표 참고), 가격은 KAMIS·참가격 기준(일부 추정). */
const MENUS=[
 /* ---------- 아침 ---------- */
 {id:'a1',name:'우유 바나나 오트밀',desc:'우유에 끓인 오트밀에 바나나를 얹었어요.',slot:'a',lvl:2,pro:'none',cu:'west',img:'',items:[['oat',60],['milk',150],['banana',100]]},
 {id:'a2',name:'두부 시금치 스크램블',desc:'으깬 두부를 시금치와 볶아 통밀빵과 곁들였어요.',slot:'a',lvl:3,pro:'soy',cu:'west',img:'',items:[['tofu',200],['spin',60],['oil',5],['bread',50]]},
 {id:'a3',name:'에그 아보카도 샌드위치',desc:'통밀빵에 삶은 달걀과 아보카도를 넣었어요.',slot:'a',lvl:1,pro:'egg',cu:'west',img:'',items:[['bread',70],['boilegg',100],['avo',60],['lettuce',20]]},
 {id:'a4',name:'그릭요거트 베리 볼',desc:'그릭요거트에 블루베리와 그래놀라를 올렸어요.',slot:'a',lvl:1,pro:'egg',cu:'west',img:'',items:[['yog',200],['blueberry',80],['granola',30]]},
 {id:'a5',name:'두유 블루베리 오트밀',desc:'두유에 불린 오트밀에 블루베리와 치아시드를 더했어요.',slot:'a',lvl:1,pro:'soy',cu:'west',img:'',items:[['soymilk',200],['oat',60],['blueberry',80],['chia',10]]},
 {id:'a6',name:'달걀 채소 오믈렛',desc:'버섯과 시금치를 넣은 오믈렛에 통밀빵 한 쪽.',slot:'a',lvl:3,pro:'egg',cu:'west',img:'',items:[['egg',120],['mush',50],['spin',40],['oil',5],['bread',50]]},
 {id:'a7',name:'닭가슴살 토마토 샌드위치',desc:'통밀빵에 닭가슴살과 토마토, 상추를 넣었어요.',slot:'a',lvl:1,pro:'chicken',cu:'west',img:'',items:[['bread',80],['rtchicken',80],['tomato',60],['lettuce',20]]},
 {id:'a8',name:'고구마와 두유',desc:'찐 고구마와 무가당 두유 한 잔.',slot:'a',lvl:2,pro:'soy',cu:'kr',img:'',items:[['sweet',200],['soymilk',250]]},
 {id:'a9',name:'코티지치즈 키위 볼',desc:'코티지치즈에 키위와 그래놀라를 곁들였어요.',slot:'a',lvl:1,pro:'egg',cu:'west',img:'',items:[['cottage',150],['kiwi',100],['granola',30]]},
 {id:'a10',name:'땅콩버터 바나나 토스트',desc:'통밀빵에 무가당 땅콩버터와 바나나를 올렸어요.',slot:'a',lvl:1,pro:'none',cu:'west',img:'',items:[['bread',70],['pnut',20],['banana',100]]},
 {id:'a11',name:'삶은 달걀과 고구마',desc:'삶은 달걀 두 개, 찐 고구마, 사과 반 개.',slot:'a',lvl:2,pro:'egg',cu:'kr',img:'',items:[['boilegg',100],['sweet',150],['apple',100]]},
 {id:'a12',name:'낫토 김치 현미밥',desc:'현미밥에 낫토와 김치를 올리고 참기름을 둘렀어요.',slot:'a',lvl:2,pro:'soy',cu:'world',img:'',items:[['natto',50],['ricepack',180],['kimchi',50],['sesoil',3]]},
 {id:'a13',name:'두부 애호박 된장국과 현미밥',desc:'두부와 애호박, 버섯을 넣은 된장국에 현미밥.',slot:'a',lvl:3,pro:'soy',cu:'kr',img:'',items:[['tofu',100],['zuc',50],['mush',40],['doen',15],['brice',60]]},
 {id:'a14',name:'참치 통밀 샌드위치',desc:'참치와 오이를 요거트에 버무려 통밀빵에 넣었어요.',slot:'a',lvl:1,pro:'fish',cu:'west',img:'',items:[['bread',80],['tuna',70],['cuc',40],['yog',30]]},
 {id:'a15',name:'요거트 베리 스무디',desc:'그릭요거트, 바나나, 블루베리, 오트밀을 함께 갈았어요.',slot:'a',lvl:1,pro:'egg',cu:'west',img:'',items:[['yog',150],['banana',100],['blueberry',80],['oat',30]]},
 {id:'a16',name:'두유 그래놀라',desc:'무가당 두유에 그래놀라와 바나나를 담았어요.',slot:'a',lvl:1,pro:'none',cu:'west',img:'',items:[['soymilk',200],['granola',50],['banana',80]]},
 {id:'a17',name:'닭가슴살 채소 랩',desc:'또띠아에 닭가슴살과 상추, 토마토를 말았어요.',slot:'a',lvl:1,pro:'chicken',cu:'west',img:'',items:[['tortilla',60],['rtchicken',80],['lettuce',30],['tomato',50],['yog',20]]},
 {id:'a18',name:'단호박 수프와 통밀빵',desc:'단호박을 우유와 곱게 끓여 통밀빵과 곁들였어요.',slot:'a',lvl:3,pro:'none',cu:'west',img:'',items:[['pumpkin',200],['milk',150],['bread',40],['oil',5]]},
 {id:'a19',name:'토마토 달걀볶음 토스트',desc:'토마토와 달걀을 함께 볶아 통밀빵에 올렸어요.',slot:'a',lvl:3,pro:'egg',cu:'world',img:'',items:[['egg',100],['tomato',100],['bread',60],['oil',5]]},
 {id:'a20',name:'에다마메 고구마 볼',desc:'삶은 에다마메와 고구마, 방울토마토를 담았어요.',slot:'a',lvl:2,pro:'soy',cu:'west',img:'',items:[['edamame',100],['sweet',150],['tomato',60]]},
 /* ---------- 점심·저녁: 닭고기 ---------- */
 {id:'m1',name:'닭가슴살 현미 브로콜리',desc:'구운 닭가슴살과 데친 브로콜리를 현미밥에 곁들였어요.',slot:'m',lvl:3,pro:'chicken',cu:'west',img:'',items:[['chicken',150],['brice',80],['broc',100],['oil',5]]},
 {id:'m4',name:'닭가슴살 양배추 볶음밥',desc:'닭가슴살과 양배추를 현미밥과 함께 볶았어요.',slot:'m',lvl:3,pro:'chicken',cu:'kr',img:'',items:[['chicken',120],['brice',80],['cabbage',100],['oil',8]]},
 {id:'m9',name:'닭가슴살 감자 샐러드',desc:'닭가슴살과 감자, 채소를 가볍게 버무렸어요.',slot:'m',lvl:2,pro:'chicken',cu:'west',img:'',items:[['rtchicken',130],['potato',200],['tomato',80],['spin',50],['oil',8]]},
 {id:'c1',name:'치킨 퀴노아 볼',desc:'구운 닭가슴살, 브로콜리, 퀴노아를 한 그릇에.',slot:'m',lvl:3,pro:'chicken',cu:'west',img:'',items:[['chicken',130],['quinoa',70],['broc',80],['tomato',60],['oil',8],['lemon',10]]},
 {id:'c2',name:'요거트 드레싱 치킨 시저 샐러드',desc:'로메인과 닭가슴살에 요거트 드레싱과 파마산을 더했어요.',slot:'m',lvl:1,pro:'chicken',cu:'west',img:'',items:[['rtchicken',130],['lettuce',120],['bread',50],['parm',10],['yog',50],['lemon',10],['oil',5]]},
 {id:'c3',name:'바질 치킨 파스타',desc:'닭가슴살과 토마토, 바질로 맛을 낸 통밀 파스타.',slot:'m',lvl:3,pro:'chicken',cu:'west',img:'',items:[['pasta',80],['chicken',110],['tomatocan',150],['basil',5],['garlic',5],['oil',8]]},
 {id:'c4',name:'치킨 페스토 샌드위치',desc:'통밀빵에 닭가슴살과 바질 페스토, 토마토를 넣었어요.',slot:'m',lvl:1,pro:'chicken',cu:'west',img:'',items:[['bread',100],['rtchicken',90],['pesto',15],['tomato',50],['lettuce',20]]},
 {id:'c5',name:'허브 닭가슴살 구이와 고구마',desc:'허브로 구운 닭가슴살에 고구마와 파프리카를 곁들였어요.',slot:'m',lvl:3,pro:'chicken',cu:'west',img:'',items:[['chicken',150],['sweet',200],['paprika',80],['oil',8]]},
 {id:'c6',name:'닭다리살 채소 오븐구이',desc:'닭다리살과 감자, 당근, 양파를 함께 구웠어요.',slot:'m',lvl:4,pro:'chicken',cu:'west',img:'',items:[['thigh',150],['potato',150],['carrot',60],['onion',60],['oil',8]]},
 {id:'c7',name:'닭고기 채소 수프',desc:'닭다리살과 채소를 뭉근히 끓여 통밀빵과 곁들였어요.',slot:'m',lvl:4,pro:'chicken',cu:'west',img:'',items:[['thigh',120],['carrot',60],['onion',60],['potato',100],['cabbage',80],['bread',50]]},
 {id:'c8',name:'터키 랩',desc:'또띠아에 칠면조 가슴살과 아보카도, 채소를 말았어요.',slot:'m',lvl:2,pro:'chicken',cu:'west',img:'',items:[['tortilla',70],['turkey',90],['lettuce',30],['tomato',50],['avo',40]]},
 {id:'c9',name:'닭안심 고추장 덮밥',desc:'닭안심과 양파, 양배추를 고추장에 볶아 현미밥에 얹었어요.',slot:'m',lvl:3,pro:'chicken',cu:'kr',img:'',items:[['tender',130],['brice',80],['onion',50],['cabbage',60],['gochu',15],['sesoil',3]]},
 {id:'c10',name:'닭가슴살 김치볶음밥',desc:'닭가슴살과 김치를 볶은 현미밥에 달걀을 올렸어요.',slot:'m',lvl:3,pro:'chicken',cu:'kr',img:'',items:[['chicken',100],['brice',80],['kimchi',80],['egg',50],['oil',6]]},
 {id:'c11',name:'베트남식 닭고기 쌀국수',desc:'닭가슴살과 콩나물, 대파를 올린 맑은 쌀국수.',slot:'m',lvl:3,pro:'chicken',cu:'world',img:'',items:[['ricenoodle',70],['chicken',100],['sprout',80],['scallion',20],['onion',30]]},
 /* ---------- 점심·저녁: 소·돼지 ---------- */
 {id:'m5',name:'돼지 안심 채소 볶음과 현미밥',desc:'돼지 안심과 채소를 볶아 현미밥과 함께 담았어요.',slot:'m',lvl:3,pro:'red',cu:'kr',img:'',items:[['pork',130],['brice',80],['cabbage',100],['mush',60],['oil',8]]},
 {id:'m6',name:'소고기 버섯 덮밥',desc:'소고기와 버섯을 볶아 현미밥에 얹었어요.',slot:'m',lvl:3,pro:'red',cu:'kr',img:'',items:[['beef',120],['brice',80],['mush',80],['oil',6]]},
 {id:'m10',name:'소고기 스테이크와 구운 채소',desc:'소고기 우둔살에 고구마와 브로콜리를 함께 구웠어요.',slot:'m',lvl:3,pro:'red',cu:'west',img:'',items:[['beef',150],['sweet',150],['broc',100],['oil',6]]},
 {id:'r1',name:'로즈마리 돼지 안심 구이',desc:'돼지 안심을 감자, 당근과 함께 오븐에 구웠어요.',slot:'m',lvl:4,pro:'red',cu:'west',img:'',items:[['pork',150],['potato',200],['carrot',60],['oil',8]]},
 {id:'r2',name:'저당 제육 현미 덮밥',desc:'돼지 뒷다리살과 채소를 고추장에 볶아 현미밥에 얹었어요.',slot:'m',lvl:3,pro:'red',cu:'kr',img:'',items:[['porkleg',130],['onion',60],['cabbage',60],['gochu',20],['brice',80],['oil',5]]},
 {id:'r3',name:'소고기 미역국과 현미밥',desc:'소고기와 미역을 참기름에 볶아 끓인 미역국.',slot:'m',lvl:3,pro:'red',cu:'kr',img:'',items:[['beef',70],['seaweed',80],['sesoil',5],['soy',5],['garlic',5],['brice',80]]},
 {id:'r4',name:'소불고기 버섯 쌈밥',desc:'간장에 재운 소고기와 표고버섯을 상추에 싸 먹어요.',slot:'m',lvl:4,pro:'red',cu:'kr',img:'',items:[['beef',120],['shiitake',50],['onion',50],['soy',10],['lettuce',60],['brice',80],['sesoil',4]]},
 {id:'r5',name:'소고기 토마토 파스타',desc:'소고기 다짐육과 토마토로 끓인 소스의 통밀 파스타.',slot:'m',lvl:4,pro:'red',cu:'west',img:'',items:[['mince',100],['pasta',80],['tomatocan',150],['onion',50],['garlic',5],['oil',5]]},
 {id:'r6',name:'돼지 안심 가지 덮밥',desc:'돼지 안심과 가지, 파프리카를 간장에 볶았어요.',slot:'m',lvl:3,pro:'red',cu:'kr',img:'',items:[['pork',120],['eggplant',100],['paprika',50],['soy',10],['brice',80],['oil',8]]},
 {id:'r7',name:'소고기 채소 비빔밥',desc:'소고기 볶음과 나물, 달걀을 현미밥에 비볐어요.',slot:'m',lvl:4,pro:'red',cu:'kr',img:'',items:[['mince',80],['sprout',60],['spin',60],['carrot',40],['brice',80],['egg',50],['gochu',10],['sesoil',4]]},
 /* ---------- 점심·저녁: 생선·해산물 ---------- */
 {id:'m2',name:'구운 연어 고구마',desc:'구운 연어에 고구마와 브로콜리를 곁들였어요.',slot:'m',lvl:4,pro:'fish',cu:'west',img:'',items:[['salmon',130],['sweet',200],['broc',80]]},
 {id:'f1',name:'레몬 연어 오븐구이',desc:'레몬을 올린 연어를 감자, 아스파라거스와 함께 구웠어요.',slot:'m',lvl:4,pro:'fish',cu:'west',img:'',items:[['salmon',130],['asparagus',100],['potato',150],['lemon',15],['oil',5]]},
 {id:'f2',name:'연어 샐러드',desc:'구운 연어와 퀴노아, 아보카도를 채소에 올렸어요.',slot:'m',lvl:3,pro:'fish',cu:'west',img:'',items:[['salmon',110],['lettuce',100],['cuc',60],['avo',40],['quinoa',40],['lemon',10],['oil',5]]},
 {id:'f3',name:'고등어구이 정식',desc:'구운 고등어에 현미밥과 시금치나물을 곁들였어요.',slot:'m',lvl:3,pro:'fish',cu:'kr',img:'',items:[['mack',130],['brice',80],['spin',80],['sesoil',3]]},
 {id:'f4',name:'삼치구이와 무 된장국',desc:'구운 삼치에 무를 넣은 된장국과 현미밥.',slot:'m',lvl:4,pro:'fish',cu:'kr',img:'',items:[['samchi',130],['brice',80],['radish',60],['doen',12]]},
 {id:'f5',name:'허브 대구구이',desc:'허브로 구운 대구에 감자와 애호박을 곁들였어요.',slot:'m',lvl:4,pro:'fish',cu:'west',img:'',items:[['cod',160],['potato',150],['zuc',80],['lemon',10],['oil',8]]},
 {id:'f6',name:'새우 마늘 파스타',desc:'새우와 마늘, 브로콜리를 올리브유에 볶은 통밀 파스타.',slot:'m',lvl:3,pro:'fish',cu:'west',img:'',items:[['shrimp',120],['pasta',80],['garlic',10],['broc',80],['oil',10]]},
 {id:'f7',name:'새우 아보카도 샐러드',desc:'데친 새우와 아보카도, 퀴노아를 채소에 올렸어요.',slot:'m',lvl:3,pro:'fish',cu:'west',img:'',items:[['shrimp',120],['avo',70],['lettuce',80],['tomato',60],['quinoa',40],['lemon',10]]},
 {id:'f8',name:'참치 콩 샐러드',desc:'참치와 병아리콩, 오이, 토마토를 레몬 드레싱에 버무렸어요.',slot:'m',lvl:1,pro:'fish',cu:'west',img:'',items:[['tuna',80],['chickcan',100],['cuc',60],['tomato',60],['lettuce',60],['oil',8],['lemon',10]]},
 {id:'f9',name:'오징어 채소 볶음 덮밥',desc:'오징어와 채소를 고추장에 볶아 현미밥에 얹었어요.',slot:'m',lvl:3,pro:'fish',cu:'kr',img:'',items:[['squid',150],['onion',60],['cabbage',60],['carrot',30],['gochu',15],['brice',80],['oil',5]]},
 {id:'f10',name:'구운 연어 아보카도 덮밥',desc:'구운 연어와 아보카도, 오이를 현미밥에 올렸어요.',slot:'m',lvl:3,pro:'fish',cu:'world',img:'',items:[['salmon',100],['brice',80],['avo',40],['cuc',50],['soy',8],['sesame',3]]},
 {id:'f11',name:'참치 김치 덮밥',desc:'참치와 김치, 양파를 볶아 현미밥에 얹었어요.',slot:'m',lvl:3,pro:'fish',cu:'kr',img:'',items:[['tuna',80],['kimchi',80],['onion',40],['brice',80],['oil',5]]},
 /* ---------- 점심·저녁: 두부·콩 ---------- */
 {id:'m3',name:'렌틸 시금치 수프',desc:'렌틸콩과 시금치를 뭉근하게 끓여 통밀빵과 곁들였어요.',slot:'m',lvl:4,pro:'soy',cu:'west',img:'',items:[['lentil',70],['spin',80],['onion',50],['oil',8],['bread',50]]},
 {id:'m7',name:'두부 콩나물 비빔밥',desc:'두부와 콩나물, 시금치를 현미밥에 비볐어요.',slot:'m',lvl:3,pro:'soy',cu:'kr',img:'',items:[['tofu',150],['brice',80],['sprout',100],['spin',60],['oil',5]]},
 {id:'m11',name:'오븐구이 두부와 채소',desc:'두부를 노릇하게 굽고 브로콜리와 감자를 곁들였어요.',slot:'m',lvl:3,pro:'soy',cu:'west',img:'',items:[['tofu',200],['broc',100],['potato',120],['oil',8]]},
 {id:'m13',name:'병아리콩 토마토 볶음밥',desc:'병아리콩과 토마토를 현미밥과 함께 볶았어요.',slot:'m',lvl:3,pro:'soy',cu:'west',img:'',items:[['chickpea',70],['tomato',120],['spin',60],['brice',70],['oil',8]]},
 {id:'m14',name:'감자 두부 버섯 조림',desc:'두부와 감자, 버섯을 자작하게 조려 현미밥과 함께.',slot:'m',lvl:3,pro:'soy',cu:'kr',img:'',items:[['tofu',150],['potato',150],['mush',60],['soy',10],['brice',70],['oil',6]]},
 {id:'s1',name:'후무스 채소 랩',desc:'병아리콩 후무스와 채소를 통밀 또띠아에 말았어요.',slot:'m',lvl:1,pro:'soy',cu:'world',img:'',items:[['tortilla',70],['chickcan',80],['tahini',15],['lemon',10],['cuc',50],['paprika',50],['lettuce',30]]},
 {id:'s2',name:'고추장 두부 랩',desc:'고추장에 구운 두부와 양배추를 또띠아에 말았어요.',slot:'m',lvl:3,pro:'soy',cu:'world',img:'',items:[['tortilla',70],['tofu',150],['gochu',10],['cabbage',50],['oil',5]]},
 {id:'s3',name:'토마토 렌틸 파스타',desc:'렌틸콩을 넣은 토마토 소스 통밀 파스타.',slot:'m',lvl:3,pro:'soy',cu:'west',img:'',items:[['pasta',80],['lentil',30],['tomatocan',150],['onion',50],['oil',8]]},
 {id:'s4',name:'흰강낭콩 채소 수프',desc:'흰강낭콩과 채소를 토마토와 끓여 통밀빵과 곁들였어요.',slot:'m',lvl:4,pro:'soy',cu:'west',img:'',items:[['whitebean',60],['carrot',50],['onion',50],['tomatocan',100],['cabbage',60],['oil',8],['bread',40]]},
 {id:'s5',name:'병아리콩 샐러드',desc:'병아리콩과 퀴노아, 채소를 레몬 드레싱에 버무렸어요.',slot:'m',lvl:3,pro:'soy',cu:'west',img:'',items:[['chickcan',120],['quinoa',30],['cuc',60],['tomato',60],['paprika',50],['lemon',10],['oil',10]]},
 {id:'s6',name:'렌틸콩 고구마 샐러드',desc:'삶은 렌틸콩과 고구마, 시금치를 함께 담았어요.',slot:'m',lvl:3,pro:'soy',cu:'west',img:'',items:[['lentil',50],['sweet',100],['spin',40],['tomato',60],['onion',30],['oil',10],['lemon',10]]},
 {id:'s7',name:'두부 된장찌개와 현미밥',desc:'두부와 애호박, 양파를 넣은 된장찌개.',slot:'m',lvl:3,pro:'soy',cu:'kr',img:'',items:[['tofu',150],['zuc',60],['onion',40],['doen',20],['brice',80]]},
 {id:'s8',name:'순두부찌개와 현미밥',desc:'순두부에 달걀과 애호박을 넣어 칼칼하게 끓였어요.',slot:'m',lvl:3,pro:'soy',cu:'kr',img:'',items:[['softtofu',250],['egg',50],['zuc',50],['gochu',10],['onion',30],['brice',80]]},
 {id:'s9',name:'에다마메 퀴노아 볼',desc:'에다마메와 퀴노아, 채소에 타히니 드레싱을 곁들였어요.',slot:'m',lvl:3,pro:'soy',cu:'world',img:'',items:[['edamame',100],['quinoa',60],['cabbage',60],['carrot',40],['tahini',10]]},
 {id:'s10',name:'낫토 비빔밥',desc:'낫토와 콩나물, 시금치, 김치를 현미밥에 비볐어요.',slot:'m',lvl:2,pro:'soy',cu:'kr',img:'',items:[['natto',50],['ricepack',200],['sprout',60],['spin',50],['kimchi',40],['sesoil',4]]},
 {id:'s11',name:'메밀 두부 비빔면',desc:'메밀면에 구운 두부와 오이를 올려 고추장에 비볐어요.',slot:'m',lvl:3,pro:'soy',cu:'kr',img:'',items:[['soba',70],['tofu',120],['cuc',50],['gochu',15],['sesoil',4]]},
 {id:'s12',name:'토마토 채소 수프',desc:'토마토와 양배추, 병아리콩을 끓여 통밀빵과 곁들였어요.',slot:'m',lvl:3,pro:'soy',cu:'west',img:'',items:[['tomatocan',200],['cabbage',80],['carrot',50],['onion',50],['chickcan',80],['oil',8],['bread',40]]},
 /* ---------- 점심·저녁: 달걀·유제품 ---------- */
 {id:'m8',name:'달걀 채소 덮밥',desc:'달걀과 채소를 볶아 현미밥에 얹었어요.',slot:'m',lvl:3,pro:'egg',cu:'kr',img:'',items:[['egg',100],['brice',80],['spin',60],['mush',50],['oil',6]]},
 {id:'m12',name:'달걀 토마토 샌드위치',desc:'통밀빵에 삶은 달걀과 토마토, 시금치를 넣었어요.',slot:'m',lvl:1,pro:'egg',cu:'west',img:'',items:[['bread',100],['boilegg',100],['tomato',80],['spin',40]]},
 {id:'e1',name:'토마토 달걀볶음 덮밥',desc:'토마토와 달걀을 볶아 현미밥에 얹었어요.',slot:'m',lvl:3,pro:'egg',cu:'world',img:'',items:[['egg',120],['tomato',150],['scallion',20],['brice',80],['oil',8]]},
 {id:'e2',name:'시금치 리코타 파스타',desc:'시금치와 리코타치즈로 부드럽게 만든 통밀 파스타.',slot:'m',lvl:3,pro:'egg',cu:'west',img:'',items:[['pasta',80],['ricotta',60],['spin',80],['garlic',5],['oil',8]]},
 {id:'e3',name:'버섯 크림 파스타',desc:'생크림 대신 우유와 파마산으로 만든 버섯 파스타.',slot:'m',lvl:3,pro:'egg',cu:'west',img:'',items:[['pasta',80],['mush',100],['milk',150],['parm',10],['oil',8],['garlic',5]]},
 {id:'e4',name:'주키니 면 파스타',desc:'애호박을 면처럼 썰어 토마토 소스와 모차렐라를 올렸어요.',slot:'m',lvl:3,pro:'egg',cu:'west',img:'',items:[['zuc',250],['tomatocan',150],['mozz',50],['garlic',5],['oil',8]]},
 {id:'e5',name:'비트 리코타 샐러드',desc:'구운 비트와 리코타, 호두, 퀴노아를 채소에 올렸어요.',slot:'m',lvl:3,pro:'egg',cu:'west',img:'',items:[['beet',120],['ricotta',60],['lettuce',60],['walnut',15],['quinoa',40],['oil',5]]},
 {id:'e6',name:'브로콜리 수프와 통밀빵',desc:'브로콜리와 감자를 우유에 곱게 끓였어요.',slot:'m',lvl:3,pro:'egg',cu:'west',img:'',items:[['broc',200],['potato',100],['milk',150],['onion',40],['bread',50]]},

 /* ---------- 추가: 아침 ---------- */
 {id:'a21',name:'단호박찜과 삶은 달걀',desc:'포슬하게 찐 단호박에 삶은 달걀 두 개.',slot:'a',lvl:2,pro:'egg',cu:'kr',img:'',sea:['소금'],items:[['pumpkin',250],['boilegg',100]]},
 {id:'a22',name:'달걀 채소전',desc:'애호박과 대파를 넣어 달걀물로 얇게 부쳤어요.',slot:'a',lvl:3,pro:'egg',cu:'kr',img:'',sea:['소금','후추'],items:[['egg',100],['wflour',30],['zuc',50],['scallion',20],['oil',8]]},
 {id:'a23',name:'참치 주먹밥',desc:'참치와 현미밥을 뭉쳐 김으로 감쌌어요.',slot:'a',lvl:2,pro:'fish',cu:'kr',img:'',sea:['소금'],items:[['tuna',60],['ricepack',180],['gim',3],['sesoil',3],['cuc',40]]},
 {id:'a24',name:'연어 오차즈케',desc:'현미밥에 구운 연어와 김을 올리고 녹차를 부었어요.',slot:'a',lvl:3,pro:'fish',cu:'world',img:'',sea:['녹차','간장 약간'],items:[['salmon',80],['brice',70],['gim',2],['scallion',10]]},
 /* ---------- 추가: 한식 ---------- */
 {id:'k1',name:'연어구이 정식',desc:'구운 연어에 현미밥, 시금치나물, 김치를 곁들였어요.',slot:'m',lvl:3,pro:'fish',cu:'kr',img:'',sea:['소금','국간장'],items:[['salmon',120],['brice',80],['spin',60],['kimchi',40],['sesoil',3]]},
 {id:'k2',name:'닭고기 쌈밥',desc:'구운 닭다리살을 상추에 싸서 쌈장과 먹어요.',slot:'m',lvl:3,pro:'chicken',cu:'kr',img:'',sea:['마늘','후추'],items:[['thigh',130],['lettuce',80],['ssam',15],['brice',80],['cuc',40]]},
 {id:'k3',name:'소고기 채소볶음 정식',desc:'소고기와 양파, 파프리카, 당근을 간장에 볶았어요.',slot:'m',lvl:3,pro:'red',cu:'kr',img:'',sea:['후추','생강'],items:[['beef',120],['onion',50],['paprika',50],['carrot',30],['soy',10],['brice',80],['oil',6]]},
 {id:'k4',name:'두부 채소덮밥',desc:'두부와 애호박, 당근을 간장에 볶아 현미밥에 얹었어요.',slot:'m',lvl:3,pro:'soy',cu:'kr',img:'',sea:['후추'],items:[['tofu',150],['zuc',60],['carrot',40],['onion',40],['soy',10],['brice',80],['oil',6]]},
 {id:'k5',name:'콩나물밥',desc:'콩나물과 소고기를 넣어 지은 밥을 양념장에 비볐어요.',slot:'m',lvl:3,pro:'red',cu:'kr',img:'',sea:['고춧가루','대파'],items:[['sprout',150],['mince',60],['brice',80],['soy',10],['sesoil',4]]},
 {id:'k6',name:'곤드레밥과 두부구이',desc:'들기름에 비빈 곤드레밥에 노릇한 두부구이.',slot:'m',lvl:3,pro:'soy',cu:'kr',img:'',sea:['소금'],items:[['gondre',60],['brice',80],['periloil',5],['soy',10],['tofu',120]]},
 {id:'k7',name:'나물 비빔밥',desc:'고사리, 시금치, 콩나물, 당근에 달걀을 올려 비볐어요.',slot:'m',lvl:4,pro:'egg',cu:'kr',img:'',sea:['국간장','마늘'],items:[['fern',50],['spin',60],['sprout',60],['carrot',40],['brice',80],['egg',50],['gochu',10],['sesoil',4]]},
 {id:'k8',name:'소고기뭇국과 현미밥',desc:'소고기와 무를 맑게 끓인 국.',slot:'m',lvl:3,pro:'red',cu:'kr',img:'',sea:['국간장','마늘','대파'],items:[['beef',80],['radish',150],['scallion',20],['soy',5],['brice',80],['sesoil',3]]},
 {id:'k9',name:'콩나물국과 두부구이 정식',desc:'시원한 콩나물국에 두부구이와 현미밥.',slot:'m',lvl:3,pro:'soy',cu:'kr',img:'',sea:['소금','다시마 육수'],items:[['sprout',150],['tofu',150],['brice',80],['scallion',20],['oil',5]]},
 {id:'k10',name:'북엇국 정식',desc:'북어와 무, 두부, 달걀을 넣어 끓인 맑은 국.',slot:'m',lvl:3,pro:'fish',cu:'kr',img:'',sea:['국간장','마늘'],items:[['bugeo',25],['egg',50],['radish',80],['tofu',60],['brice',80],['sesoil',3]]},
 {id:'k11',name:'닭개장',desc:'닭다리살과 고사리, 숙주, 대파로 칼칼하게 끓였어요.',slot:'m',lvl:4,pro:'chicken',cu:'kr',img:'',sea:['고춧가루','국간장','마늘'],items:[['thigh',130],['fern',40],['mungsprout',60],['scallion',40],['sesoil',5],['brice',80]]},
 {id:'k12',name:'버섯들깨탕',desc:'버섯과 두부를 들깻가루로 고소하게 끓였어요.',slot:'m',lvl:3,pro:'soy',cu:'kr',img:'',sea:['국간장','다시마 육수'],items:[['mush',80],['shiitake',40],['perillap',20],['tofu',100],['brice',80]]},
 {id:'k13',name:'감자국과 두부부침',desc:'감자와 양파로 끓인 국에 두부부침을 곁들였어요.',slot:'m',lvl:3,pro:'soy',cu:'kr',img:'',sea:['국간장','대파'],items:[['potato',150],['onion',40],['tofu',100],['brice',80],['oil',5]]},
 {id:'k14',name:'청국장찌개와 현미밥',desc:'청국장에 두부, 애호박, 김치를 넣어 끓였어요.',slot:'m',lvl:3,pro:'soy',cu:'kr',img:'',sea:['고춧가루','멸치 육수'],items:[['cheong',40],['tofu',100],['zuc',50],['kimchi',40],['brice',80]]},
 {id:'k15',name:'닭다리살 간장구이 정식',desc:'간장에 재운 닭다리살 구이와 애호박볶음, 현미밥.',slot:'m',lvl:3,pro:'chicken',cu:'kr',img:'',sea:['마늘','생강'],items:[['thigh',150],['soy',10],['zuc',80],['brice',80],['oil',6]]},
 {id:'k16',name:'두부구이와 가지구이 정식',desc:'노릇한 두부구이와 가지구이에 현미밥과 김치.',slot:'m',lvl:3,pro:'soy',cu:'kr',img:'',sea:['간장','소금'],items:[['tofu',180],['eggplant',100],['kimchi',40],['brice',80],['oil',8]]},
 {id:'k17',name:'닭고기 채소찜',desc:'닭다리살과 감자, 당근을 간장 양념에 쪘어요.',slot:'m',lvl:4,pro:'chicken',cu:'kr',img:'',sea:['마늘','생강','후추'],items:[['thigh',150],['potato',120],['carrot',50],['onion',50],['soy',15],['brice',60]]},
 {id:'k18',name:'삼치조림 정식',desc:'삼치와 무를 간장에 조려 현미밥과 함께.',slot:'m',lvl:4,pro:'fish',cu:'kr',img:'',sea:['고춧가루','마늘'],items:[['samchi',130],['radish',100],['soy',10],['brice',80]]},
 {id:'k19',name:'코다리찜 정식',desc:'코다리와 무를 매콤하게 쪄 현미밥과 곁들였어요.',slot:'m',lvl:4,pro:'fish',cu:'kr',img:'',sea:['고춧가루','마늘','대파'],items:[['pollock',150],['radish',80],['gochu',10],['soy',10],['brice',80]]},
 {id:'k20',name:'소고기 장조림 정식',desc:'소고기와 달걀, 표고버섯을 간장에 조렸어요.',slot:'m',lvl:4,pro:'red',cu:'kr',img:'',sea:['마늘','생강'],items:[['beef',100],['egg',50],['shiitake',30],['soy',15],['brice',80],['spin',50]]},
 {id:'k21',name:'달걀찜 정식',desc:'부드러운 달걀찜에 현미밥과 시금치나물.',slot:'m',lvl:2,pro:'egg',cu:'kr',img:'',sea:['새우젓 또는 소금','다시마 육수'],items:[['egg',150],['scallion',10],['ricepack',200],['spin',60],['sesoil',3]]},
 {id:'k22',name:'들기름 메밀면',desc:'메밀면을 들기름과 간장에 비비고 김, 달걀을 올렸어요.',slot:'m',lvl:3,pro:'egg',cu:'kr',img:'',sea:['참깨'],items:[['soba',80],['periloil',8],['soy',8],['gim',2],['egg',50],['cuc',30]]},
 {id:'k23',name:'두부면 잡채',desc:'두부면에 시금치, 당근, 표고를 넣어 볶았어요.',slot:'m',lvl:3,pro:'soy',cu:'kr',img:'',sea:['마늘','후추'],items:[['tofunoodle',150],['spin',50],['carrot',40],['onion',40],['shiitake',30],['soy',10],['sesoil',4]]},
 {id:'k24',name:'두부부침과 채소전',desc:'두부부침과 애호박·당근 채소전을 함께 담았어요.',slot:'m',lvl:3,pro:'soy',cu:'kr',img:'',sea:['소금','초간장'],items:[['tofu',150],['wflour',40],['zuc',50],['carrot',30],['oil',10]]},
 /* ---------- 추가: 세계 음식 ---------- */
 {id:'w1',name:'연어 데리야키 볼',desc:'간장 소스로 구운 연어와 브로콜리를 현미밥에 올렸어요.',slot:'m',lvl:3,pro:'fish',cu:'world',img:'',sea:['생강','마늘'],items:[['salmon',120],['brice',80],['broc',60],['soy',10],['sesame',3]]},
 {id:'w2',name:'새우 월남쌈',desc:'라이스페이퍼에 새우와 채소를 말아 먹어요.',slot:'m',lvl:3,pro:'fish',cu:'world',img:'',sea:['액젓','라임 또는 레몬','고수'],items:[['ricepaper',40],['shrimp',100],['lettuce',40],['cuc',40],['carrot',30],['paprika',30],['ricenoodle',30]]},
 {id:'w3',name:'태국식 바질 치킨 덮밥',desc:'닭다리살과 파프리카를 바질과 볶아 달걀프라이를 올렸어요.',slot:'m',lvl:3,pro:'chicken',cu:'world',img:'',sea:['액젓','마늘','칠리 파우더'],items:[['thigh',130],['paprika',50],['onion',40],['basil',5],['egg',50],['brice',80],['oil',6]]},
 {id:'w4',name:'메밀 두부 누들볼',desc:'메밀면에 두부와 에다마메, 채소를 담아 간장 소스로.',slot:'m',lvl:3,pro:'soy',cu:'world',img:'',sea:['식초','참깨'],items:[['soba',70],['tofu',120],['edamame',50],['cuc',40],['carrot',30],['soy',8],['sesame',3]]},
 {id:'w5',name:'닭고기 오야코동',desc:'닭다리살과 양파를 달걀로 부드럽게 익혀 밥에 얹었어요.',slot:'m',lvl:3,pro:'chicken',cu:'world',img:'',sea:['가쓰오부시 육수'],items:[['thigh',100],['egg',100],['onion',60],['soy',10],['brice',80]]},
 {id:'w6',name:'참치 포케',desc:'참치회와 아보카도, 에다마메를 현미밥에 올렸어요.',slot:'m',lvl:2,pro:'fish',cu:'world',img:'',sea:['참깨','식초'],items:[['tunaraw',100],['ricepack',200],['avo',40],['cuc',40],['edamame',40],['soy',8],['sesame',3]]},
 {id:'w7',name:'소고기 샤브샤브',desc:'얇은 소고기와 채소를 데쳐 먹고 남은 육수에 밥을 말아요.',slot:'m',lvl:3,pro:'red',cu:'world',img:'',sea:['다시마 육수','간장'],items:[['beef',120],['cabbage',100],['mush',60],['bokchoy',60],['tofu',60],['brice',60]]},
 {id:'w8',name:'메밀소바와 달걀',desc:'차가운 메밀소바에 무와 대파, 반숙 달걀을 곁들였어요.',slot:'m',lvl:3,pro:'egg',cu:'world',img:'',sea:['가쓰오부시 육수','간장'],items:[['soba',90],['radish',50],['scallion',15],['egg',100]]},
 {id:'w9',name:'청경채 소고기볶음',desc:'소고기와 청경채, 마늘을 센 불에 볶았어요.',slot:'m',lvl:3,pro:'red',cu:'world',img:'',sea:['생강','후추'],items:[['beef',120],['bokchoy',120],['garlic',8],['soy',10],['brice',80],['oil',6]]},
 {id:'w10',name:'새우 브로콜리볶음',desc:'새우와 브로콜리를 마늘에 볶아 현미밥과 곁들였어요.',slot:'m',lvl:3,pro:'fish',cu:'world',img:'',sea:['소금','후추','생강'],items:[['shrimp',130],['broc',120],['garlic',8],['brice',80],['oil',8]]},
 {id:'w11',name:'버섯 마파두부 덮밥',desc:'고기 대신 표고버섯으로 만든 매콤한 마파두부.',slot:'m',lvl:3,pro:'soy',cu:'world',img:'',sea:['고춧가루','생강','마늘'],items:[['tofu',200],['shiitake',50],['scallion',20],['gochu',10],['soy',8],['brice',80],['oil',6]]},
 {id:'w12',name:'채소 계란볶음밥',desc:'달걀과 당근, 파프리카, 대파를 현미밥과 볶았어요.',slot:'m',lvl:3,pro:'egg',cu:'world',img:'',sea:['소금','후추'],items:[['egg',100],['brice',80],['carrot',40],['paprika',40],['scallion',20],['oil',8]]},
 {id:'w13',name:'태국식 새우볶음밥',desc:'새우와 달걀, 양파를 현미밥과 볶았어요.',slot:'m',lvl:3,pro:'fish',cu:'world',img:'',sea:['액젓','라임 또는 레몬'],items:[['shrimp',100],['brice',80],['egg',50],['onion',40],['scallion',20],['oil',8]]},
 {id:'w14',name:'코코넛 치킨 커리',desc:'닭가슴살과 채소를 코코넛밀크와 커리 페이스트로 끓였어요.',slot:'m',lvl:4,pro:'chicken',cu:'world',img:'',sea:['액젓'],items:[['chicken',130],['coco',80],['curryp',10],['onion',50],['paprika',50],['brice',80]]},
 {id:'w15',name:'땅콩 소스 두부볼',desc:'구운 두부와 채소에 땅콩버터 소스를 곁들였어요.',slot:'m',lvl:3,pro:'soy',cu:'world',img:'',sea:['식초','간장'],items:[['tofu',150],['pnut',15],['brice',70],['cabbage',50],['carrot',40],['cuc',40],['soy',5]]},
 {id:'w16',name:'렌틸 달과 현미밥',desc:'렌틸콩을 토마토와 향신료로 끓인 인도식 달.',slot:'m',lvl:3,pro:'soy',cu:'world',img:'',sea:['강황','큐민','생강'],items:[['lentil',70],['onion',50],['tomatocan',100],['oil',8],['brice',60]]},
 {id:'w17',name:'병아리콩 시금치 커리',desc:'병아리콩과 시금치를 토마토, 코코넛밀크로 끓였어요.',slot:'m',lvl:4,pro:'soy',cu:'world',img:'',sea:['카레가루','큐민','생강'],items:[['chickpea',70],['tomatocan',150],['onion',50],['spin',40],['coco',40],['brice',60]]},
 {id:'w18',name:'탄두리 치킨',desc:'요거트와 향신료에 재운 닭다리살을 구워 오이와 곁들였어요.',slot:'m',lvl:4,pro:'chicken',cu:'world',img:'',sea:['파프리카 파우더','큐민','강황'],items:[['thigh',150],['yog',50],['cuc',60],['onion',30],['brice',70]]},
 {id:'w19',name:'시금치 두부 커리',desc:'시금치를 곱게 갈아 두부와 끓인 커리.',slot:'m',lvl:4,pro:'soy',cu:'world',img:'',sea:['카레가루','큐민','생강'],items:[['tofu',150],['spin',150],['onion',50],['coco',30],['brice',70]]},
 {id:'w20',name:'김치 퀴노아 볼',desc:'퀴노아에 볶은 김치와 두부, 달걀을 올렸어요.',slot:'m',lvl:3,pro:'soy',cu:'world',img:'',sea:['참깨'],items:[['quinoa',60],['kimchi',60],['tofu',120],['egg',50],['cuc',40],['sesoil',4]]},
 {id:'w21',name:'고추장 치킨 랩',desc:'고추장 소스에 버무린 닭가슴살과 양배추를 또띠아에 말았어요.',slot:'m',lvl:1,pro:'chicken',cu:'world',img:'',sea:['마늘'],items:[['tortilla',70],['rtchicken',110],['gochu',10],['cabbage',50],['lettuce',20]]},
 {id:'w22',name:'된장 드레싱 두부 샐러드',desc:'두부와 채소, 퀴노아에 된장 드레싱을 곁들였어요.',slot:'m',lvl:3,pro:'soy',cu:'world',img:'',sea:['식초','참깨'],items:[['tofu',150],['lettuce',100],['cuc',50],['tomato',60],['quinoa',40],['doen',10],['sesoil',5]]},
 {id:'w23',name:'쌈장 닭고기 볼',desc:'닭가슴살과 채소, 현미밥에 쌈장 소스를 곁들였어요.',slot:'m',lvl:3,pro:'chicken',cu:'world',img:'',sea:['참깨'],items:[['chicken',130],['brice',80],['lettuce',50],['cabbage',50],['ssam',15],['cuc',40]]},

 /* ---------- 사용자 DB(REC) 추가: 아침 ---------- */
 {id:'R13',name:'현미밥 달걀국',desc:'달걀을 풀어 끓인 맑은 국에 현미밥과 김.',slot:'a',lvl:3,pro:'egg',cu:'kr',img:'',sea:['대파','저염 채소 육수'],items:[['brice',60],['egg',100],['gim',2]]},
 {id:'R27',name:'두부 김밥',desc:'구운 두부와 달걀, 당근, 오이를 넣어 말았어요.',slot:'a',lvl:4,pro:'soy',cu:'kr',img:'',sea:['소금'],items:[['gim',3],['tofu',120],['brice',60],['carrot',40],['cuc',40],['egg',50],['sesoil',3]]},
 {id:'R75',name:'사과 시나몬 오트밀',desc:'우유에 끓인 오트밀에 사과와 호두, 계피를 더했어요.',slot:'a',lvl:2,pro:'none',cu:'west',img:'',sea:['계피'],items:[['oat',50],['milk',150],['apple',100],['walnut',10]]},
 {id:'R77',name:'치아시드 푸딩',desc:'우유에 불린 치아시드에 딸기와 바나나를 올렸어요.',slot:'a',lvl:1,pro:'egg',cu:'west',img:'',sea:['바닐라 추출물 약간'],items:[['chia',25],['milk',200],['strawberry',80],['banana',60]]},
 {id:'R78',name:'바나나 달걀 팬케이크',desc:'바나나와 달걀, 오트밀만으로 부친 팬케이크.',slot:'a',lvl:3,pro:'egg',cu:'west',img:'',sea:['계피'],items:[['banana',100],['egg',100],['oat',40],['oil',5]]},
 {id:'R79',name:'훈제 연어 토스트',desc:'통밀빵에 요거트를 바르고 훈제 연어와 오이를 올렸어요.',slot:'a',lvl:1,pro:'fish',cu:'west',img:'',sea:['레몬즙'],items:[['bread',70],['smsalmon',60],['yog',40],['cuc',40]]},
 {id:'R81',name:'채소 달걀죽',desc:'현미밥에 당근, 애호박, 달걀을 넣어 부드럽게 끓였어요.',slot:'a',lvl:3,pro:'egg',cu:'kr',img:'',sea:['저염 채소 육수','소금'],items:[['brice',50],['egg',100],['carrot',40],['zuc',50]]},
 {id:'R82',name:'단호박 요거트 볼',desc:'찐 단호박에 그릭요거트와 호박씨를 곁들였어요.',slot:'a',lvl:2,pro:'egg',cu:'west',img:'',sea:['계피'],items:[['pumpkin',150],['yog',150],['pseed',10]]},
 {id:'R115',name:'토마토 아보카도 토스트',desc:'통밀빵에 아보카도와 토마토, 햄프시드를 올렸어요.',slot:'a',lvl:1,pro:'none',cu:'west',img:'',sea:['레몬즙','후추'],items:[['bread',70],['tomato',80],['avo',60],['hemp',10]]},
 {id:'R117',name:'채소 오트밀 짭짤죽',desc:'오트밀에 버섯과 시금치를 넣어 죽처럼 끓였어요.',slot:'a',lvl:3,pro:'none',cu:'kr',img:'',sea:['대파','저염 채소 육수'],items:[['oat',50],['mush',60],['spin',50],['sesame',3]]},
 /* ---------- 사용자 DB(REC) 추가: 점심·저녁 ---------- */
 {id:'R14',name:'두부조림과 잡곡밥',desc:'두부를 간장 양념에 자작하게 조려 밥과 함께.',slot:'m',lvl:3,pro:'soy',cu:'kr',img:'',sea:['대파','고춧가루'],items:[['tofu',200],['brice',70],['onion',50],['soy',10]]},
 {id:'R25',name:'닭가슴살 비빔 메밀면',desc:'메밀면에 닭가슴살과 채소를 올려 고추장에 비볐어요.',slot:'m',lvl:3,pro:'chicken',cu:'kr',img:'',sea:['식초'],items:[['chicken',120],['soba',70],['cuc',60],['carrot',40],['gochu',15]]},
 {id:'R29',name:'병아리콩 비빔밥',desc:'병아리콩과 나물을 현미밥에 올려 고추장에 비볐어요.',slot:'m',lvl:3,pro:'soy',cu:'kr',img:'',sea:[],items:[['chickcan',120],['brice',70],['spin',60],['carrot',40],['cuc',40],['gochu',10],['sesoil',4]]},
 {id:'R51',name:'가지 렌틸 라자냐',desc:'면 대신 가지를 겹치고 렌틸 토마토 소스와 치즈를 올려 구웠어요.',slot:'m',lvl:5,pro:'soy',cu:'west',img:'',sea:['바질'],items:[['eggplant',150],['lentil',40],['tomatocan',150],['ricotta',60],['mozz',40]]},
 {id:'R65',name:'레몬 민트 치킨 볼',desc:'구운 닭다리살과 채소를 현미밥에 올리고 레몬과 민트로 마무리.',slot:'m',lvl:4,pro:'chicken',cu:'world',img:'',sea:['레몬즙','민트'],items:[['thigh',130],['brice',70],['cuc',50],['carrot',40],['soy',5]]},
 {id:'R68',name:'두부 채소 볶음면',desc:'곤약면에 두부와 청경채, 당근을 넣어 간장에 볶았어요.',slot:'m',lvl:3,pro:'soy',cu:'world',img:'',sea:['생강'],items:[['konjac',150],['tofu',150],['bokchoy',80],['carrot',40],['soy',10],['oil',5]]},
 {id:'R69',name:'베트남식 닭고기 샐러드',desc:'닭가슴살과 양배추, 당근을 액젓 라임 드레싱에 버무렸어요.',slot:'m',lvl:3,pro:'chicken',cu:'world',img:'',sea:['고수','라임즙'],items:[['chicken',120],['cabbage',100],['carrot',40],['cuc',50],['fishsauce',10]]},
 {id:'R70',name:'템페 채소볶음',desc:'템페와 브로콜리, 파프리카를 간장에 볶아 현미밥과 함께.',slot:'m',lvl:3,pro:'soy',cu:'world',img:'',sea:['마늘'],items:[['tempeh',120],['broc',70],['paprika',50],['onion',40],['soy',10],['brice',70],['oil',5]]},
 {id:'R94',name:'렌틸 토마토 스튜',desc:'렌틸콩과 당근, 셀러리를 토마토에 뭉근히 끓였어요.',slot:'m',lvl:4,pro:'soy',cu:'west',img:'',sea:['오레가노'],items:[['lentil',60],['tomatocan',150],['carrot',50],['onion',50],['celery',50],['oil',5]]},
 {id:'R95',name:'퀴노아 검은콩 볼',desc:'퀴노아에 검은콩, 옥수수, 아보카도를 올렸어요.',slot:'m',lvl:3,pro:'soy',cu:'world',img:'',sea:['라임즙','고수'],items:[['quinoa',55],['blackbean',100],['corn',70],['avo',50]]},
 {id:'R96',name:'검은콩 고구마 볼',desc:'구운 고구마와 검은콩, 채소, 아보카도를 한 그릇에.',slot:'m',lvl:4,pro:'soy',cu:'world',img:'',sea:['라임즙'],items:[['blackbean',100],['sweet',150],['lettuce',50],['tomato',60],['avo',50]]},
 {id:'R97',name:'템페 통밀 샌드위치',desc:'구운 템페와 채소, 아보카도를 통밀빵에 넣었어요.',slot:'m',lvl:3,pro:'soy',cu:'west',img:'',sea:['홀그레인 머스터드'],items:[['tempeh',100],['bread',80],['lettuce',30],['tomato',50],['avo',40]]},
 {id:'R98',name:'강낭콩 채소 칠리',desc:'강낭콩과 파프리카를 토마토와 향신료로 끓여 밥에 곁들였어요.',slot:'m',lvl:4,pro:'soy',cu:'world',img:'',sea:['큐민','칠리 파우더'],items:[['kidney',120],['tomatocan',150],['paprika',50],['onion',50],['brice',60],['oil',5]]},
 {id:'R99',name:'두부 채소 만두',desc:'두부와 양배추, 부추로 소를 채운 만두.',slot:'m',lvl:5,pro:'soy',cu:'kr',img:'',sea:['초간장'],items:[['tofu',150],['cabbage',80],['carrot',30],['chive',40],['dumpwrap',70],['soy',5]]},
 {id:'R100',name:'가지 렌틸 토마토구이',desc:'가지 위에 렌틸 토마토 소스를 올려 오븐에 구웠어요.',slot:'m',lvl:4,pro:'soy',cu:'west',img:'',sea:['바질'],items:[['eggplant',150],['lentil',40],['tomatocan',150],['oil',8]]},
 {id:'R101',name:'후무스 퀴노아 볼',desc:'퀴노아에 후무스와 오이, 당근, 토마토를 곁들였어요.',slot:'m',lvl:3,pro:'soy',cu:'west',img:'',sea:['레몬즙'],items:[['quinoa',55],['hummus',80],['cuc',50],['carrot',40],['tomato',60]]},
 {id:'R102',name:'코코넛 두부 채소 커리',desc:'두부와 콜리플라워, 시금치를 코코넛밀크로 끓였어요.',slot:'m',lvl:4,pro:'soy',cu:'world',img:'',sea:['카레가루'],items:[['tofu',150],['cauli',80],['spin',50],['coco',60],['brice',60]]},
 {id:'R103',name:'두부 김치볶음밥',desc:'두부와 김치를 현미밥과 함께 볶았어요.',slot:'m',lvl:3,pro:'soy',cu:'kr',img:'',sea:['대파'],items:[['tofu',150],['brice',70],['kimchi',70],['carrot',40],['sesoil',4]]},
 {id:'R104',name:'에다마메 채소 볶음',desc:'에다마메와 브로콜리, 파프리카를 볶아 현미밥과 함께.',slot:'m',lvl:3,pro:'soy',cu:'world',img:'',sea:['마늘'],items:[['edamame',120],['broc',70],['paprika',50],['carrot',40],['soy',8],['brice',70],['oil',5]]},
 {id:'R105',name:'병아리콩 토마토 샌드위치',desc:'으깬 병아리콩과 아보카도, 토마토를 통밀빵에 넣었어요.',slot:'m',lvl:1,pro:'soy',cu:'west',img:'',sea:['레몬즙','파슬리'],items:[['bread',80],['chickcan',100],['avo',40],['tomato',60]]},
 {id:'R107',name:'렌틸콩 미트볼 파스타',desc:'렌틸콩과 오트밀로 만든 미트볼을 토마토 파스타에 올렸어요.',slot:'m',lvl:5,pro:'soy',cu:'west',img:'',sea:['바질'],items:[['lentil',50],['oat',30],['pasta',70],['tomatocan',150],['oil',5]]},
 {id:'R108',name:'두부 채소 타코',desc:'향신료에 볶은 두부와 채소를 또띠아에 올렸어요.',slot:'m',lvl:3,pro:'soy',cu:'world',img:'',sea:['큐민','라임즙'],items:[['tofu',150],['tortilla',70],['lettuce',30],['tomato',60],['avo',40],['oil',5]]},
 {id:'R109',name:'검은콩 옥수수 샐러드',desc:'검은콩과 옥수수, 파프리카, 오이를 라임 드레싱에 버무렸어요.',slot:'m',lvl:1,pro:'soy',cu:'world',img:'',sea:['라임즙','고수'],items:[['blackbean',120],['corn',70],['paprika',50],['cuc',50],['oil',5]]},
 {id:'R112',name:'완두콩 민트 수프',desc:'완두콩과 양파를 곱게 갈아 끓이고 통밀빵을 곁들였어요.',slot:'m',lvl:3,pro:'soy',cu:'west',img:'',sea:['민트','저염 채소 육수'],items:[['peas',150],['onion',50],['oil',5],['bread',60]]},
 {id:'R114',name:'단호박 병아리콩 커리',desc:'단호박과 병아리콩, 시금치를 코코넛밀크로 끓였어요.',slot:'m',lvl:4,pro:'soy',cu:'world',img:'',sea:['카레가루'],items:[['pumpkin',150],['chickcan',100],['spin',50],['coco',60],['brice',60]]},
 {id:'R116',name:'고구마 병아리콩 샐러드',desc:'구운 고구마와 병아리콩, 케일에 타히니 드레싱.',slot:'m',lvl:4,pro:'soy',cu:'west',img:'',sea:['레몬즙'],items:[['sweet',150],['chickcan',100],['kale',50],['tahini',10]]},
 {id:'R118',name:'두부와 채소 꼬치구이',desc:'두부와 애호박, 파프리카, 양파를 꼬치에 꿰어 구웠어요.',slot:'m',lvl:4,pro:'soy',cu:'west',img:'',sea:['로즈마리'],items:[['tofu',180],['zuc',80],['paprika',60],['onion',50],['oil',8]]},
 {id:'R119',name:'퀴노아 속채운 파프리카',desc:'파프리카에 퀴노아와 검은콩, 토마토를 채워 구웠어요.',slot:'m',lvl:5,pro:'soy',cu:'west',img:'',sea:['큐민'],items:[['paprika',150],['quinoa',50],['blackbean',100],['tomatocan',80],['onion',40]]},
 {id:'R121',name:'아보카도 에다마메 메밀볼',desc:'메밀면에 에다마메와 아보카도, 오이를 올렸어요.',slot:'m',lvl:3,pro:'soy',cu:'world',img:'',sea:['라임즙'],items:[['soba',70],['edamame',100],['avo',50],['cuc',50],['soy',8]]},
 {id:'R122',name:'버섯 보리 리조또',desc:'보리와 양송이버섯을 채소 육수로 끓인 리조또.',slot:'m',lvl:4,pro:'none',cu:'west',img:'',sea:['저염 채소 육수','파슬리'],items:[['barley',70],['mush',120],['onion',50],['oil',8]]},
 {id:'R123',name:'렌틸콩 채소 주먹밥',desc:'렌틸콩과 당근을 섞은 현미밥을 김으로 감쌌어요.',slot:'m',lvl:3,pro:'soy',cu:'kr',img:'',sea:['소금'],items:[['brice',70],['lentil',30],['carrot',40],['gim',2],['sesame',3],['sesoil',3]]},
 {id:'R124',name:'양배추 두부 스테이크',desc:'두툼하게 구운 양배추와 두부 스테이크에 현미밥.',slot:'m',lvl:4,pro:'soy',cu:'west',img:'',sea:['마늘'],items:[['cabbage',150],['tofu',150],['oil',8],['soy',8],['brice',70]]},
/* ---------- 조리 수준 1단계(조리 없이): 썰고 담고 섞기만. 통조림·시판 조리 닭가슴살·훈제 연어·두부 등 바로 먹는 재료 사용 ---------- */
 {id:'L1',name:'닭가슴살 그릭 샐러드',desc:'닭가슴살과 채소에 올리브유 레몬 드레싱을 뿌리고 통밀빵을 곁들였어요.',slot:'m',lvl:1,pro:'chicken',cu:'west',img:'',sea:['오레가노','후추'],items:[['rtchicken',160],['lettuce',100],['tomato',100],['cuc',75],['onion',25],['oil',12],['lemon',10],['bread',75]]},
 {id:'L2',name:'닭가슴살 아보카도 샌드위치',desc:'통밀빵에 닭가슴살과 아보카도, 토마토를 넣었어요.',slot:'m',lvl:1,pro:'chicken',cu:'west',img:'',sea:['후추'],items:[['bread',125],['rtchicken',125],['avo',60],['tomato',75],['lettuce',25]]},
 {id:'L3',name:'닭가슴살 후무스 랩',desc:'또띠아에 후무스를 바르고 닭가슴살과 채소를 말았어요.',slot:'m',lvl:1,pro:'chicken',cu:'world',img:'',sea:['레몬즙'],items:[['tortilla',90],['rtchicken',125],['hummus',60],['lettuce',40],['cuc',60],['paprika',50]]},
 {id:'L4',name:'닭가슴살 두부면 냉채',desc:'두부면에 닭가슴살과 채소를 올리고 겨자 간장에 버무렸어요.',slot:'m',lvl:1,pro:'chicken',cu:'world',img:'',sea:['식초','연겨자'],items:[['tofunoodle',225],['rtchicken',140],['cuc',75],['carrot',40],['soy',8],['sesoil',9],['sesame',3]]},
 {id:'L5',name:'닭가슴살 월남쌈',desc:'미지근한 물에 불린 라이스페이퍼에 닭가슴살과 채소를 말았어요.',slot:'m',lvl:1,pro:'chicken',cu:'world',img:'',sea:['액젓','라임 또는 레몬'],items:[['ricepaper',60],['rtchicken',140],['lettuce',50],['cuc',60],['carrot',40],['paprika',50],['avo',40]]},
 {id:'L6',name:'요거트 치킨 샐러드 샌드위치',desc:'닭가슴살과 셀러리, 사과를 그릭요거트에 버무려 통밀빵에 넣었어요.',slot:'m',lvl:1,pro:'chicken',cu:'west',img:'',sea:['홀그레인 머스터드','후추'],items:[['bread',125],['rtchicken',110],['yog',60],['celery',40],['apple',60]]},
 {id:'L7',name:'훈제 연어 샐러드',desc:'훈제 연어와 아보카도를 채소에 올리고 통밀빵을 곁들였어요.',slot:'m',lvl:1,pro:'fish',cu:'west',img:'',sea:['레몬즙','후추'],items:[['smsalmon',110],['lettuce',100],['cuc',75],['avo',60],['bread',75],['oil',6]]},
 {id:'L8',name:'훈제 연어 리코타 샌드위치',desc:'통밀빵에 리코타치즈를 바르고 훈제 연어와 오이를 올렸어요.',slot:'m',lvl:1,pro:'fish',cu:'west',img:'',sea:['레몬즙','딜'],items:[['bread',125],['smsalmon',100],['ricotta',50],['cuc',50],['lettuce',25]]},
 {id:'L9',name:'참치 니수아즈 샐러드',desc:'참치와 삶은 달걀, 병아리콩을 채소에 올리고 통밀빵을 곁들였어요.',slot:'m',lvl:1,pro:'fish',cu:'west',img:'',sea:['식초','후추'],items:[['tuna',100],['boilegg',60],['chickcan',75],['tomato',100],['lettuce',75],['oil',10],['bread',60]]},
 {id:'L10',name:'강낭콩 참치 샐러드',desc:'강낭콩과 참치, 파프리카, 오이를 레몬 드레싱에 버무렸어요.',slot:'m',lvl:1,pro:'fish',cu:'west',img:'',sea:['파슬리'],items:[['kidney',150],['tuna',100],['paprika',60],['cuc',60],['onion',25],['oil',10],['lemon',10],['bread',50]]},
 {id:'L11',name:'카프레제 샌드위치',desc:'통밀빵에 모차렐라와 토마토, 바질을 넣고 올리브유를 뿌렸어요.',slot:'m',lvl:1,pro:'egg',cu:'west',img:'',sea:['후추'],items:[['bread',125],['mozz',75],['tomato',100],['basil',5],['oil',6],['lettuce',25]]},
 {id:'L12',name:'코티지치즈 병아리콩 샐러드',desc:'코티지치즈와 병아리콩, 채소를 담고 통밀빵을 곁들였어요.',slot:'m',lvl:1,pro:'egg',cu:'west',img:'',sea:['레몬즙','후추'],items:[['cottage',150],['chickcan',125],['lettuce',75],['tomato',75],['cuc',60],['oil',10],['bread',50]]},
 {id:'L13',name:'삶은 달걀 콩 샐러드 볼',desc:'삶은 달걀과 검은콩, 옥수수, 채소를 한 그릇에 담았어요.',slot:'m',lvl:1,pro:'egg',cu:'world',img:'',sea:['라임즙','후추'],items:[['boilegg',125],['blackbean',125],['corn',60],['lettuce',75],['tomato',75],['avo',40],['oil',6]]},
 {id:'L14',name:'연두부 두부면 샐러드',desc:'연두부와 두부면, 아보카도, 채소에 간장 참기름 드레싱을 뿌렸어요.',slot:'m',lvl:1,pro:'soy',cu:'world',img:'',sea:['식초'],items:[['silken',190],['tofunoodle',190],['avo',60],['lettuce',75],['cuc',75],['soy',8],['sesoil',8],['sesame',3]]},
 {id:'L15',name:'두부면 비빔 샐러드',desc:'두부면과 두부, 채소를 고추장 드레싱에 비볐어요.',slot:'m',lvl:1,pro:'soy',cu:'kr',img:'',sea:['식초','참깨'],items:[['tofunoodle',190],['tofu',190],['cuc',75],['carrot',50],['lettuce',50],['gochu',20],['sesoil',9]]},
 {id:'L16',name:'두부 월남쌈',desc:'미지근한 물에 불린 라이스페이퍼에 두부와 채소를 말았어요.',slot:'m',lvl:1,pro:'soy',cu:'world',img:'',sea:['라임 또는 레몬','간장'],items:[['ricepaper',60],['tofu',190],['lettuce',50],['cuc',60],['carrot',40],['paprika',50],['avo',40]]},
 {id:'L17',name:'낫토 연두부 볼',desc:'연두부에 낫토와 아보카도, 오이를 올리고 김을 곁들였어요.',slot:'m',lvl:1,pro:'soy',cu:'world',img:'',sea:['참깨'],items:[['natto',100],['silken',190],['avo',75],['cuc',60],['gim',2],['soy',5],['sesoil',5],['scallion',10]]},
 {id:'L18',name:'검은콩 아보카도 랩',desc:'또띠아에 검은콩과 아보카도, 옥수수, 토마토를 말았어요.',slot:'m',lvl:1,pro:'soy',cu:'world',img:'',sea:['라임즙','큐민'],items:[['tortilla',90],['blackbean',125],['avo',60],['corn',50],['tomato',60],['lettuce',25]]},
 {id:'L19',name:'후무스 채소 플레이트',desc:'후무스와 병아리콩, 채소 스틱에 통밀빵을 곁들였어요.',slot:'m',lvl:1,pro:'soy',cu:'west',img:'',sea:['레몬즙','파프리카 파우더'],items:[['hummus',125],['chickcan',75],['bread',100],['cuc',75],['carrot',60],['paprika',60]]},
 /* ---------- 조리 수준 2단계(전자레인지): 즉석 현미밥 데우기, 채소·고구마 찌기, 달걀찜, 덮개를 덮고 속까지 익히기 ---------- */
 {id:'L21',name:'닭가슴살 김치 덮밥',desc:'데운 현미밥에 닭가슴살과 김치를 올리고 김을 곁들였어요.',slot:'m',lvl:2,pro:'chicken',cu:'kr',img:'',sea:['참깨'],items:[['ricepack',225],['rtchicken',110],['kimchi',65],['sesoil',4],['gim',2]]},
 {id:'L22',name:'닭가슴살 쌈밥',desc:'데운 현미밥과 닭가슴살을 상추에 싸서 쌈장과 먹어요.',slot:'m',lvl:2,pro:'chicken',cu:'kr',img:'',sea:['마늘'],items:[['ricepack',225],['rtchicken',125],['lettuce',80],['ssam',15],['cuc',55]]},
 {id:'L23',name:'전자레인지 돼지 안심 수육 쌈밥',desc:'돼지 안심을 덮개를 덮어 전자레인지로 속까지 익힌 뒤 상추에 싸 먹어요.',slot:'m',lvl:2,pro:'red',cu:'kr',img:'',sea:['대파','통후추','마늘'],items:[['pork',145],['ricepack',200],['lettuce',80],['ssam',15],['cuc',45]]},
 {id:'L24',name:'전자레인지 소불고기 덮밥',desc:'간장 양념한 소고기와 양파를 전자레인지로 익혀 현미밥에 얹었어요.',slot:'m',lvl:2,pro:'red',cu:'kr',img:'',sea:['마늘','후추'],items:[['beef',125],['onion',55],['carrot',35],['soy',10],['sesoil',4],['ricepack',225]]},
 {id:'L25',name:'참치 김 비빔밥',desc:'데운 현미밥에 참치와 오이, 김을 올려 참기름에 비볐어요.',slot:'m',lvl:2,pro:'fish',cu:'kr',img:'',sea:['참깨'],items:[['ricepack',225],['tuna',90],['cuc',55],['gim',3],['sesoil',4],['soy',5]]},
 {id:'L26',name:'전자레인지 고등어구이 정식',desc:'순살 고등어를 전자레인지로 익히고 현미밥, 김치를 곁들였어요.',slot:'m',lvl:2,pro:'fish',cu:'kr',img:'',sea:['소금'],items:[['mack',135],['ricepack',225],['kimchi',55],['cuc',45]]},
 {id:'L27',name:'두부 김치 덮밥',desc:'데운 두부와 김치를 현미밥에 올리고 참기름을 둘렀어요.',slot:'m',lvl:2,pro:'soy',cu:'kr',img:'',sea:['참깨'],items:[['ricepack',200],['tofu',170],['kimchi',80],['sesoil',4],['scallion',10]]},
 {id:'L28',name:'연두부 간장 비빔밥',desc:'데운 현미밥에 연두부와 대파, 김을 올려 간장에 비볐어요.',slot:'m',lvl:2,pro:'soy',cu:'kr',img:'',sea:['참깨'],items:[['ricepack',225],['silken',225],['scallion',10],['soy',8],['sesoil',6],['gim',2]]},
 {id:'L29',name:'콩나물 두부 비빔밥',desc:'전자레인지로 익힌 콩나물과 두부를 현미밥에 올려 비볐어요.',slot:'m',lvl:2,pro:'soy',cu:'kr',img:'',sea:['참깨'],items:[['ricepack',200],['sprout',110],['tofu',135],['gochu',10],['sesoil',4]]},
 {id:'L30',name:'달걀찜 비빔밥',desc:'전자레인지 달걀찜과 익힌 시금치를 현미밥에 올려 비볐어요.',slot:'m',lvl:2,pro:'egg',cu:'kr',img:'',sea:['참깨'],items:[['egg',110],['ricepack',200],['spin',65],['gochu',10],['sesoil',4]]},
 {id:'L31',name:'미역 두부 냉국과 현미밥',desc:'불린 미역과 오이, 두부로 만든 냉국에 데운 현미밥을 곁들였어요.',slot:'m',lvl:2,pro:'soy',cu:'kr',img:'',sea:['식초','참깨','찬물'],items:[['seaweed',65],['cuc',80],['tofu',170],['ricepack',200],['soy',6]]},
 {id:'L32',name:'전자레인지 연어 레몬찜',desc:'연어와 브로콜리, 고구마를 덮개를 덮어 전자레인지로 쪘어요.',slot:'m',lvl:2,pro:'fish',cu:'west',img:'',sea:['소금','후추'],items:[['salmon',135],['broc',90],['sweet',170],['lemon',10],['oil',6]]},
 {id:'L33',name:'전자레인지 대구 토마토찜',desc:'대구와 애호박에 토마토를 부어 전자레인지로 익히고 통밀빵을 곁들였어요.',slot:'m',lvl:2,pro:'fish',cu:'west',img:'',sea:['마늘','바질'],items:[['cod',170],['tomatocan',135],['zuc',90],['oil',9],['bread',80]]},
 {id:'L34',name:'닭가슴살 고구마 볼',desc:'닭가슴살에 전자레인지로 익힌 고구마와 브로콜리를 곁들였어요.',slot:'m',lvl:2,pro:'chicken',cu:'west',img:'',sea:['소금','후추'],items:[['rtchicken',135],['sweet',245],['broc',90],['oil',9]]},
 {id:'L35',name:'감자 코티지치즈 볼',desc:'전자레인지로 익힌 감자와 브로콜리에 코티지치즈를 올렸어요.',slot:'m',lvl:2,pro:'egg',cu:'west',img:'',sea:['후추','파슬리'],items:[['potato',280],['cottage',145],['broc',90],['oil',9]]},
 {id:'L36',name:'머그 스크램블 토스트',desc:'머그컵에 달걀과 시금치를 넣어 전자레인지로 익히고 통밀빵에 올렸어요.',slot:'m',lvl:2,pro:'egg',cu:'west',img:'',sea:['소금','후추'],items:[['egg',135],['spin',45],['bread',100],['tomato',65]]},
 {id:'L37',name:'병아리콩 토마토 스튜',desc:'병아리콩과 토마토, 시금치를 전자레인지로 끓이고 통밀빵을 곁들였어요.',slot:'m',lvl:2,pro:'soy',cu:'west',img:'',sea:['큐민','파프리카 파우더'],items:[['chickcan',145],['tomatocan',170],['spin',55],['onion',45],['oil',9],['bread',55]]},
 {id:'L38',name:'강낭콩 칠리 볼',desc:'강낭콩과 토마토, 옥수수를 전자레인지로 데워 현미밥에 얹었어요.',slot:'m',lvl:2,pro:'soy',cu:'world',img:'',sea:['칠리 파우더','큐민'],items:[['kidney',135],['tomatocan',135],['corn',55],['paprika',55],['ricepack',170]]},
 {id:'L39',name:'에다마메 현미 포케',desc:'데운 현미밥에 에다마메와 아보카도, 오이를 올렸어요.',slot:'m',lvl:2,pro:'soy',cu:'world',img:'',sea:['참깨','식초'],items:[['edamame',110],['ricepack',200],['avo',45],['cuc',55],['carrot',35],['soy',8]]},
 {id:'L40',name:'닭가슴살 포케',desc:'데운 현미밥에 닭가슴살과 아보카도, 옥수수를 올렸어요.',slot:'m',lvl:2,pro:'chicken',cu:'world',img:'',sea:['참깨','식초'],items:[['rtchicken',125],['ricepack',200],['avo',45],['cuc',55],['corn',45],['soy',8]]},
 {id:'L41',name:'훈제 연어 포케',desc:'데운 현미밥에 훈제 연어와 아보카도, 에다마메를 올렸어요.',slot:'m',lvl:2,pro:'fish',cu:'world',img:'',sea:['참깨','식초'],items:[['smsalmon',90],['ricepack',200],['avo',45],['cuc',55],['edamame',45],['soy',5]]},
 {id:'L42',name:'검은콩 부리토 볼',desc:'데운 현미밥에 검은콩과 옥수수, 토마토, 아보카도를 담았어요.',slot:'m',lvl:2,pro:'soy',cu:'world',img:'',sea:['라임즙','큐민'],items:[['ricepack',180],['blackbean',110],['corn',55],['tomato',65],['avo',45],['lettuce',35]]},
 {id:'L43',name:'두부 달걀찜 덮밥',desc:'연두부와 달걀을 전자레인지로 부드럽게 쪄 현미밥에 얹었어요.',slot:'m',lvl:2,pro:'egg',cu:'kr',img:'',sea:['참깨'],items:[['egg',110],['silken',110],['scallion',10],['soy',5],['ricepack',200]]},
 /* ---------- 달걀 한식·세계 음식 보강 ---------- */
 {id:'L45',name:'부추 달걀볶음 정식',desc:'부추와 달걀을 볶아 현미밥과 김치를 곁들였어요.',slot:'m',lvl:3,pro:'egg',cu:'kr',img:'',sea:['소금','후추'],items:[['egg',120],['chive',60],['oil',6],['brice',80],['kimchi',40]]},
 {id:'L46',name:'토마토 달걀국과 현미밥',desc:'토마토와 달걀을 풀어 끓인 국에 현미밥을 곁들였어요.',slot:'m',lvl:3,pro:'egg',cu:'world',img:'',sea:['소금','후추'],items:[['egg',100],['tomato',120],['scallion',15],['brice',80],['sesoil',3]]},
 {id:'L47',name:'달걀 표고 장조림 정식',desc:'달걀과 표고버섯을 간장에 조려 현미밥, 시금치나물과 곁들였어요.',slot:'m',lvl:4,pro:'egg',cu:'kr',img:'',sea:['마늘','생강'],items:[['egg',150],['shiitake',30],['soy',15],['brice',80],['spin',50],['sesoil',3]]},
 /* ---------- 한식 아침 보강 ---------- */
 {id:'B1',name:'연두부 김 현미밥',desc:'데운 현미밥에 연두부와 김을 올리고 간장 참기름을 둘렀어요.',slot:'a',lvl:2,pro:'soy',cu:'kr',img:'',sea:['참깨'],items:[['ricepack',150],['silken',150],['gim',2],['soy',5],['sesoil',3],['scallion',5]]},
 {id:'B2',name:'달걀찜과 현미밥',desc:'전자레인지 달걀찜에 데운 현미밥과 김치를 곁들였어요.',slot:'a',lvl:2,pro:'egg',cu:'kr',img:'',sea:['소금'],items:[['egg',100],['ricepack',150],['kimchi',40],['scallion',5]]},
 {id:'B3',name:'닭가슴살 김 주먹밥',desc:'데운 현미밥에 닭가슴살을 섞어 뭉치고 김으로 감쌌어요.',slot:'a',lvl:2,pro:'chicken',cu:'kr',img:'',sea:['소금','참깨'],items:[['ricepack',150],['rtchicken',70],['gim',3],['sesoil',3],['cuc',40]]},
 {id:'B4',name:'두부 미역국과 현미밥',desc:'두부와 미역을 참기름에 볶아 끓인 미역국.',slot:'a',lvl:3,pro:'soy',cu:'kr',img:'',sea:['국간장','마늘'],items:[['tofu',100],['seaweed',60],['sesoil',4],['soy',5],['brice',60]]},
 {id:'B5',name:'콩나물 달걀국밥',desc:'콩나물국에 달걀을 풀고 현미밥을 말았어요.',slot:'a',lvl:3,pro:'egg',cu:'kr',img:'',sea:['다시마 육수','대파'],items:[['sprout',100],['egg',50],['scallion',10],['brice',60],['soy',5]]},
 {id:'B6',name:'시금치 된장국과 두부',desc:'시금치 된장국에 두부와 현미밥을 곁들였어요.',slot:'a',lvl:3,pro:'soy',cu:'kr',img:'',sea:['멸치 또는 다시마 육수'],items:[['spin',80],['doen',15],['tofu',100],['brice',60]]},
 {id:'B7',name:'소고기 채소죽',desc:'소고기와 당근, 애호박을 현미밥과 함께 부드럽게 끓였어요.',slot:'a',lvl:3,pro:'red',cu:'kr',img:'',sea:['국간장','소금'],items:[['mince',60],['carrot',30],['zuc',40],['brice',50],['sesoil',4]]},
 {id:'B8',name:'고등어구이 아침 정식',desc:'전자레인지로 익힌 순살 고등어에 현미밥과 김치를 곁들였어요.',slot:'a',lvl:2,pro:'fish',cu:'kr',img:'',sea:['소금'],items:[['mack',80],['ricepack',150],['kimchi',40]]},
 {id:'B9',name:'북어 달걀국과 현미밥',desc:'북어와 무, 달걀을 넣어 맑게 끓인 국.',slot:'a',lvl:3,pro:'fish',cu:'kr',img:'',sea:['국간장','마늘'],items:[['bugeo',15],['egg',50],['radish',50],['brice',60],['sesoil',3]]},
 {id:'B10',name:'애호박 달걀 덮밥',desc:'애호박과 달걀을 전자레인지로 익혀 현미밥에 얹었어요.',slot:'a',lvl:2,pro:'egg',cu:'kr',img:'',sea:['소금','참깨'],items:[['egg',100],['zuc',60],['ricepack',150],['soy',5],['sesoil',3]]},
 {id:'B11',name:'오이 미역 냉국과 두부밥',desc:'오이 미역 냉국에 두부와 데운 현미밥을 곁들였어요.',slot:'a',lvl:2,pro:'soy',cu:'kr',img:'',sea:['식초','찬물','참깨'],items:[['seaweed',50],['cuc',60],['tofu',100],['ricepack',150],['soy',5]]},
 /* ---------- 2026-10-25 사용자 제안 메뉴 ---------- */
 {id:'N1',name:'그릭요거트 과일 볼',desc:'그릭요거트에 딸기, 바나나, 블루베리, 키위와 호두를 올렸어요.',slot:'a',lvl:1,pro:'egg',cu:'west',img:'',sea:['계피 약간'],items:[['yog',200],['strawberry',60],['banana',50],['blueberry',40],['kiwi',50],['walnut',15]]},
 {id:'N6',name:'바나나 블루베리 요거트 볼',desc:'그릭요거트에 바나나와 블루베리, 호두를 올렸어요.',slot:'a',lvl:1,pro:'egg',cu:'west',img:'',sea:['계피 약간'],items:[['yog',200],['banana',80],['blueberry',60],['walnut',15]]},
 {id:'N7',name:'딸기 블루베리 요거트 볼',desc:'그릭요거트에 딸기와 블루베리, 호두를 올렸어요.',slot:'a',lvl:1,pro:'egg',cu:'west',img:'',sea:['계피 약간'],items:[['yog',200],['strawberry',80],['blueberry',60],['walnut',15]]},
 {id:'N8',name:'바나나 딸기 요거트 볼',desc:'그릭요거트에 바나나와 딸기, 호두를 올렸어요.',slot:'a',lvl:1,pro:'egg',cu:'west',img:'',sea:['계피 약간'],items:[['yog',200],['banana',80],['strawberry',60],['walnut',15]]},
 {id:'N2',name:'라임 갈릭 새우 덮밥',desc:'새우를 마늘에 볶아 라임즙을 뿌리고 현미밥, 채소와 담았어요.',slot:'m',lvl:3,pro:'fish',cu:'world',img:'',sea:['라임즙 또는 레몬즙','고수','후추'],items:[['shrimp',130],['garlic',10],['brice',80],['paprika',50],['broc',60],['oil',8]]},
 {id:'N3',name:'치킨 쿠스쿠스 볼',desc:'불린 통밀 쿠스쿠스에 닭가슴살과 채소를 올리고 레몬 올리브유를 뿌렸어요.',slot:'m',lvl:2,pro:'chicken',cu:'world',img:'',sea:['큐민','파슬리'],items:[['couscous',70],['rtchicken',120],['cuc',50],['tomato',60],['paprika',40],['oil',8],['lemon',10]]},
 {id:'N4',name:'스테이크 감자 플레이트',desc:'소고기 우둔살 스테이크에 감자와 완두콩을 곁들였어요.',slot:'m',lvl:3,pro:'red',cu:'west',img:'',sea:['소금','후추','로즈마리'],items:[['beef',150],['potato',200],['peas',80],['oil',8]]},
 {id:'N5',name:'새우 토마토 펜네',desc:'새우와 완두콩을 넣은 토마토 소스 통밀 펜네.',slot:'m',lvl:3,pro:'fish',cu:'west',img:'',sea:['바질','후추'],items:[['pasta',80],['shrimp',110],['tomatocan',150],['peas',60],['garlic',8],['oil',8]]},
 /* ---------- 저렴한 고단백 메뉴 (2026-10-25 추가): 하루 1만 원 예산에서도 단백질을 채우도록. 가격은 KAMIS·참가격 실제 값이 있는 재료 위주 ---------- */
 {id:'P1',name:'돼지고기 콩나물 불고기 덮밥',desc:'돼지 앞다리살과 콩나물을 고추장 양념에 볶아 현미밥에 올렸어요.',slot:'m',lvl:3,pro:'red',cu:'kr',img:'',sea:['마늘','후추'],items:[['porkleg',130],['sprout',100],['onion',50],['scallion',10],['gochu',10],['soy',6],['brice',79]]},
 {id:'P3',name:'돼지고기 양배추 볶음 정식',desc:'돼지 앞다리살과 양배추, 당근을 간장에 볶아 현미밥과 곁들였어요.',slot:'m',lvl:3,pro:'red',cu:'kr',img:'',sea:['후추'],items:[['porkleg',130],['cabbage',150],['onion',40],['carrot',30],['soy',10],['garlic',5],['brice',74]]},
 {id:'P4',name:'고등어 무조림 정식',desc:'고등어와 무를 고추장 양념에 졸여 현미밥과 차렸어요.',slot:'m',lvl:4,pro:'fish',cu:'kr',img:'',sea:['고춧가루','생강'],items:[['mack',160],['radish',150],['onion',40],['gochu',8],['soy',8],['garlic',5],['brice',79]]},
 {id:'P5',name:'명태 두부 맑은탕과 현미밥',desc:'명태와 두부, 무를 맑게 끓여 현미밥과 곁들였어요.',slot:'m',lvl:3,pro:'fish',cu:'kr',img:'',sea:['소금','후추'],items:[['pollock',150],['tofu',100],['radish',100],['scallion',15],['garlic',5],['soy',5],['brice',74]]},
 {id:'P6',name:'참치 달걀 덮밥',desc:'참치와 양파, 달걀을 전자레인지로 익혀 데운 현미밥에 올렸어요.',slot:'m',lvl:2,pro:'fish',cu:'kr',img:'',sea:['후추'],items:[['tuna',80],['egg',100],['onion',40],['soy',5],['scallion',5],['ricepack',170]]},
 {id:'P7',name:'두부 달걀 부추볶음 덮밥',desc:'두부와 달걀, 부추를 함께 볶아 현미밥에 올렸어요.',slot:'m',lvl:3,pro:'soy',cu:'kr',img:'',sea:['소금','후추'],items:[['tofu',150],['egg',100],['chive',40],['onion',30],['soy',6],['brice',70]]},
 {id:'P8',name:'고구마 달걀 우유 아침',desc:'전자레인지로 익힌 고구마와 달걀에 우유 한 잔을 곁들였어요.',slot:'a',lvl:2,pro:'egg',cu:'kr',img:'',sea:['소금'],items:[['egg',150],['sweet',80],['milk',200]]},
 {id:'P9',name:'명태 달걀국과 현미밥',desc:'명태와 무를 끓이다 달걀을 풀어 현미밥과 곁들였어요.',slot:'a',lvl:3,pro:'fish',cu:'kr',img:'',sea:['소금','후추'],items:[['pollock',80],['egg',60],['radish',60],['scallion',10],['brice',70]]},
 {id:'P11',name:'달걀 두부 된장국과 현미밥',desc:'두부와 애호박 된장국에 달걀을 풀어 현미밥과 차렸어요.',slot:'a',lvl:3,pro:'egg',cu:'kr',img:'',sea:['멸치 육수 또는 다시마 육수'],items:[['egg',100],['tofu',100],['doen',15],['zuc',50],['brice',65]]},
 {id:'P12',name:'우유 오트밀과 삶은 달걀',desc:'전자레인지로 끓인 우유 오트밀에 삶은 달걀을 곁들였어요.',slot:'a',lvl:2,pro:'egg',cu:'west',img:'',sea:['계피'],items:[['oat',50],['milk',200],['egg',100]]},
 /* ---------- 간식 (slot:'s') — 현재 화면에서는 쓰지 않음. 간식 끼니를 추가할 때 사용 ---------- */
 {id:'S48',name:'바나나 오트 쿠키',desc:'바나나와 오트밀, 호두로 구운 쿠키.',slot:'s',lvl:4,pro:'none',cu:'west',img:'',sea:['계피'],items:[['banana',80],['oat',40],['walnut',10]]},
 {id:'S83',name:'사과와 시나몬 요거트',desc:'그릭요거트에 사과와 계피를 곁들였어요.',slot:'s',lvl:1,pro:'egg',cu:'west',img:'',sea:['계피'],items:[['apple',100],['yog',100]]},
 {id:'S84',name:'구운 병아리콩',desc:'병아리콩을 향신료와 함께 바삭하게 구웠어요.',slot:'s',lvl:4,pro:'soy',cu:'west',img:'',sea:['파프리카 파우더','후추'],items:[['chickcan',100],['oil',5]]},
 {id:'S85',name:'오븐구이 고구마',desc:'고구마를 오븐에 구워 계피를 뿌렸어요.',slot:'s',lvl:4,pro:'none',cu:'kr',img:'',sea:['계피'],items:[['sweet',150]]},
 {id:'S86',name:'오이와 후무스',desc:'오이, 당근 스틱을 후무스에 찍어 먹어요.',slot:'s',lvl:1,pro:'soy',cu:'west',img:'',sea:[],items:[['cuc',80],['carrot',60],['hummus',50]]},
 {id:'S87',name:'코코아 그릭요거트',desc:'그릭요거트에 무가당 코코아와 바나나를 섞었어요.',slot:'s',lvl:1,pro:'egg',cu:'west',img:'',sea:['무가당 코코아 파우더'],items:[['yog',150],['banana',60]]},
 {id:'S88',name:'냉동 요거트 베리',desc:'요거트에 베리와 치아시드를 섞어 얼렸어요.',slot:'s',lvl:1,pro:'egg',cu:'west',img:'',sea:[],items:[['plainyog',150],['blueberry',80],['chia',10]]},
 {id:'S89',name:'에다마메 간식',desc:'삶은 에다마메에 레몬즙과 후추를 뿌렸어요.',slot:'s',lvl:2,pro:'soy',cu:'world',img:'',sea:['레몬즙','후추'],items:[['edamame',120]]},
 {id:'S90',name:'바나나 오트 에너지볼',desc:'바나나와 오트밀, 땅콩버터를 뭉쳐 만든 한입 간식.',slot:'s',lvl:3,pro:'none',cu:'west',img:'',sea:[],items:[['banana',60],['oat',40],['chia',10],['pnut',15]]},
 {id:'S91',name:'구운 사과',desc:'사과를 구워 호두와 계피를 올렸어요.',slot:'s',lvl:3,pro:'none',cu:'west',img:'',sea:['계피'],items:[['apple',150],['walnut',10]]},
 {id:'S92',name:'두부 코코아 브라우니',desc:'두부와 오트밀, 바나나로 만든 브라우니.',slot:'s',lvl:5,pro:'soy',cu:'west',img:'',sea:['무가당 코코아 파우더','바닐라 추출물 약간'],items:[['tofu',100],['oat',40],['banana',60]]}
];

