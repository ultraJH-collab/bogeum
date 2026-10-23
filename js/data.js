/* 보금 — 데모 데이터 (실데이터 연동 전 목업)
 * 금액 단위: 만원
 * 실제 서비스에서는 건축물대장(국토부), 공동주택 공시가격, 실거래가(국토부), 인터넷등기소 연계로 대체된다.
 */
window.BG = window.BG || {};

BG.CONST = {
  BASE_RATE: 2.50,          // 한국은행 기준금리(%) — 데모 가정값
  LEGAL_CONV_SPREAD: 2.0,   // 주임법 시행령 제9조: 전월세 전환율 상한 = 기준금리 + 2%p
  MARKET_CONV_RATE: 5.8,    // 관악구 비아파트 시장 전환율(%) — 데모 가정값
  HUG_MULTIPLIER: 1.26,     // 공시가 × 140% × 담보인정 90%
  TODAY: new Date('2026-10-21T10:00:00+09:00'),
};

/* 지도 좌표(x, y)는 데모 지도 레이어 기준 % */
BG.LISTINGS = [
  {
    id: 'l1', name: '해오름빌라 302호', addr: '서울 관악구 신림로23길 15', dong: '신림동',
    type: '다세대', deal: '전세', deposit: 18000, rent: 0, area: 36.4, rooms: '투룸',
    floor: 3, floors: 5, year: 2016, elevator: 1, parking: 4, violation: false, fee: 7,
    basePerM2: 760, jeonseRatio: 0.66, officialPrice: 18800, x: 30, y: 58, hue: 205,
    owner: '최*영', ownerSince: '2017-03-14', ownerType: '개인',
    gap: [{ date: '2017-03-14', type: '소유권이전', cause: '매매', who: '최*영' }],
    eul: [], seniorLease: 0, taxArrears: false, leaseOrder: false,
    tags: ['신축급', '엘리베이터'], landlordVerified: true,
  },
  {
    id: 'l2', name: '그린하우스 201호', addr: '서울 관악구 봉천로 412-3', dong: '봉천동',
    type: '다세대', deal: '전세', deposit: 21000, rent: 0, area: 33.0, rooms: '투룸',
    floor: 2, floors: 4, year: 2019, elevator: 0, parking: 3, violation: false, fee: 5,
    basePerM2: 700, jeonseRatio: 0.66, officialPrice: 16000, x: 63, y: 30, hue: 145,
    owner: '(주)그린홈', ownerSince: '2019-11-02', ownerType: '법인(임대사업자)',
    gap: [{ date: '2019-11-02', type: '소유권보존', cause: '신축', who: '(주)그린홈' }],
    eul: [], seniorLease: 0, taxArrears: true, leaseOrder: false,
    tags: ['신축', '즉시입주'], landlordVerified: false,
  },
  {
    id: 'l3', name: '리치빌 401호', addr: '서울 관악구 문성로 88', dong: '서원동',
    type: '다세대', deal: '전세', deposit: 15000, rent: 0, area: 39.6, rooms: '쓰리룸',
    floor: 4, floors: 5, year: 2012, elevator: 1, parking: 5, violation: false, fee: 8,
    basePerM2: 720, jeonseRatio: 0.65, officialPrice: 19000, x: 18, y: 36, hue: 25,
    owner: '정*수', ownerSince: '2014-06-20', ownerType: '개인',
    gap: [{ date: '2014-06-20', type: '소유권이전', cause: '매매', who: '정*수' }],
    eul: [{ date: '2022-08-11', type: '근저당권설정', amount: 9600, who: '○○농협' }],
    seniorLease: 0, taxArrears: false, leaseOrder: false,
    tags: ['시세 대비 저렴', '쓰리룸'], landlordVerified: true,
  },
  {
    id: 'l4', name: '스카이빌 501호', addr: '서울 관악구 신림로59길 7', dong: '신림동',
    type: '근린생활시설', deal: '전세', deposit: 13000, rent: 0, area: 26.4, rooms: '원룸',
    floor: 5, floors: 5, year: 2018, elevator: 1, parking: 2, violation: true, fee: 6,
    basePerM2: 580, jeonseRatio: 0.62, officialPrice: 10000, x: 44, y: 72, hue: 280,
    owner: '한*호', ownerSince: '2018-09-01', ownerType: '개인',
    gap: [{ date: '2018-09-01', type: '소유권보존', cause: '신축', who: '한*호' }],
    eul: [], seniorLease: 0, taxArrears: false, leaseOrder: false,
    tags: ['저렴', '복층'], landlordVerified: true,
    violationNote: '근린생활시설(제2종) 무단 주거 용도변경 — 위반건축물 표기',
  },
  {
    id: 'l5', name: '다온캐슬 302호', addr: '서울 관악구 봉천로 233', dong: '봉천동',
    type: '다세대', deal: '월세', deposit: 3000, rent: 55, area: 29.8, rooms: '투룸',
    floor: 3, floors: 5, year: 2015, elevator: 1, parking: 4, violation: false, fee: 6,
    basePerM2: 730, jeonseRatio: 0.66, officialPrice: 15000, x: 74, y: 52, hue: 190,
    owner: '윤*진', ownerSince: '2016-02-10', ownerType: '개인',
    gap: [{ date: '2016-02-10', type: '소유권이전', cause: '매매', who: '윤*진' }],
    eul: [], seniorLease: 0, taxArrears: false, leaseOrder: false,
    tags: ['역세권', '반려동물'], landlordVerified: true,
  },
  {
    id: 'l6', name: '남현 우리집 2층 3호', addr: '서울 관악구 남현3길 21', dong: '남현동',
    type: '다가구', deal: '전세', deposit: 12000, rent: 0, area: 29.0, rooms: '원룸',
    floor: 2, floors: 4, year: 2009, elevator: 0, parking: 6, violation: false, fee: 4,
    basePerM2: 600, jeonseRatio: 0.62, officialPrice: 120000, x: 86, y: 80, hue: 95,
    buildingValue: 200000, units: 8,
    owner: '박*철', ownerSince: '2010-05-04', ownerType: '개인',
    gap: [{ date: '2010-05-04', type: '소유권보존', cause: '신축', who: '박*철' }],
    eul: [{ date: '2015-03-02', type: '근저당권설정', amount: 36000, who: '○○은행' }],
    seniorLease: 54000, taxArrears: false, leaseOrder: false,
    tags: ['집주인 직거래', '조용한 동네'], landlordVerified: true,
  },
  {
    id: 'l7', name: '트러스트빌 203호', addr: '서울 관악구 난곡로 140', dong: '신림동',
    type: '다세대', deal: '전세', deposit: 19500, rent: 0, area: 38.0, rooms: '투룸',
    floor: 2, floors: 5, year: 2020, elevator: 1, parking: 5, violation: false, fee: 7,
    basePerM2: 770, jeonseRatio: 0.66, officialPrice: 19800, x: 12, y: 78, hue: 340,
    owner: '(주)○○하우징', ownerSince: '2026-08-28', ownerType: '법인(보유 37채)',
    gap: [
      { date: '2020-12-01', type: '소유권보존', cause: '신축', who: '김*훈' },
      { date: '2026-08-28', type: '소유권이전', cause: '매매', who: '(주)○○하우징' },
    ],
    eul: [], seniorLease: 0, taxArrears: false, leaseOrder: true,
    tags: ['신축급', '풀옵션'], landlordVerified: false,
  },
  {
    id: 'l8', name: '루체 오피스텔 1203호', addr: '서울 관악구 관악로 158', dong: '봉천동',
    type: '오피스텔', deal: '월세', deposit: 1000, rent: 68, area: 23.1, rooms: '원룸',
    floor: 12, floors: 15, year: 2021, elevator: 2, parking: 80, violation: false, fee: 12,
    basePerM2: 900, jeonseRatio: 0.72, officialPrice: 13500, x: 55, y: 16, hue: 225,
    owner: '이*민', ownerSince: '2021-07-15', ownerType: '개인',
    gap: [{ date: '2021-07-15', type: '소유권이전', cause: '분양', who: '이*민' }],
    eul: [], seniorLease: 0, taxArrears: false, leaseOrder: false,
    tags: ['서울대입구역 3분', '보안'], landlordVerified: true,
  },
  {
    id: 'l9', name: '하늘채빌라 102호', addr: '서울 관악구 은천로 61', dong: '봉천동',
    type: '다세대', deal: '전세', deposit: 17000, rent: 0, area: 42.0, rooms: '쓰리룸',
    floor: 1, floors: 4, year: 2013, elevator: 0, parking: 4, violation: false, fee: 5,
    basePerM2: 690, jeonseRatio: 0.65, officialPrice: 19500, x: 80, y: 22, hue: 10,
    owner: '○○자산신탁(주)', ownerSince: '2024-04-18', ownerType: '신탁회사',
    gap: [
      { date: '2013-10-10', type: '소유권보존', cause: '신축', who: '오*숙' },
      { date: '2024-04-18', type: '소유권이전', cause: '신탁', who: '○○자산신탁(주)', flag: '신탁' },
    ],
    eul: [], seniorLease: 0, taxArrears: false, leaseOrder: false,
    tags: ['넓은 평수', '1층 정원'], landlordVerified: false,
  },
  {
    id: 'l10', name: '새솔빌 402호', addr: '서울 관악구 신원로 35', dong: '신림동',
    type: '연립', deal: '전세', deposit: 16500, rent: 0, area: 34.7, rooms: '투룸',
    floor: 4, floors: 4, year: 2011, elevator: 0, parking: 3, violation: false, fee: 5,
    basePerM2: 720, jeonseRatio: 0.65, officialPrice: 17000, x: 36, y: 40, hue: 165,
    owner: '강*희', ownerSince: '2012-01-30', ownerType: '개인',
    gap: [{ date: '2012-01-30', type: '소유권이전', cause: '매매', who: '강*희' }],
    eul: [{ date: '2023-05-19', type: '근저당권설정', amount: 2400, who: '○○캐피탈' }],
    seniorLease: 0, taxArrears: false, leaseOrder: false,
    tags: ['신림역 7분', '탑층'], landlordVerified: true,
  },
];

/* 안심 특약 7종 — 데모 문구. 실서비스 탑재 전 변호사 감수 필수 */
BG.CLAUSES = [
  { id: 'c1', title: '잔금 익일까지 담보권 설정 금지', text: '임대인은 잔금 지급일 다음 날까지 본 목적물에 저당권 등 일체의 담보권 및 권리변동을 발생시키지 않는다. 이를 위반한 경우 임차인은 계약을 해제할 수 있으며, 임대인은 수령한 금원 전액과 계약금 상당액의 위약금을 즉시 반환한다.' },
  { id: 'c2', title: '보증보험 가입 불가 시 해제', text: '임대인의 사유 또는 목적물의 하자(위반건축물, 선순위 채권 과다 등)로 전세보증금 반환보증(HUG·HF·SGI) 가입이 거절될 경우 본 계약은 해제되며, 임대인은 수령한 금원 전액을 3영업일 이내 반환한다.' },
  { id: 'c3', title: '국세·지방세 완납 증명', text: '임대인은 계약 체결 시 및 잔금 지급 전 국세·지방세 납세증명서를 임차인에게 제시한다(주택임대차보호법 제3조의7). 체납 사실이 확인되는 경우 임차인은 계약을 해제할 수 있다.' },
  { id: 'c4', title: '잔금 전 소유권 변동 시 해제', text: '계약 체결 후 잔금 지급일까지 매매·증여·신탁 등으로 소유권이 변동될 경우 임차인은 계약을 해제할 수 있으며, 임대인은 수령한 금원 전액을 즉시 반환한다.' },
  { id: 'c5', title: '전세대출 불가 시 해제', text: '임대인 또는 목적물 사유로 임차인의 전세자금대출이 불가할 경우 본 계약은 해제되며, 임대인은 계약금을 포함한 수령 금원 전액을 반환한다.' },
  { id: 'c6', title: '선순위 임차보증금 고지 (다가구)', text: '임대인은 본 건물의 선순위 임차인 보증금 총액 및 확정일자 현황을 임차인에게 고지하였으며(주택임대차보호법 제3조의7), 고지 내용이 사실과 다를 경우 임차인은 계약을 해제하고 손해배상을 청구할 수 있다.' },
  { id: 'c7', title: '통상손모 제외 원상복구 기준', text: '통상의 사용에 따른 자연 마모·노후는 원상복구 대상에서 제외한다. 원상복구 범위는 입주 시 쌍방이 확인한 보금 사진 금고 기록(타임스탬프 및 해시값 포함)을 기준으로 판단한다.' },
];

/* 원상복구 사진 금고 — 4대 구역 12개 체크포인트 */
BG.ZONES = [
  { id: 'living', name: '거실', items: [
    { id: 'living_wall', name: '벽지(도배)', cat: 'wallpaper' },
    { id: 'living_floor', name: '바닥(장판)', cat: 'floor' },
    { id: 'living_window', name: '창호·방충망', cat: 'screen' },
  ]},
  { id: 'kitchen', name: '주방', items: [
    { id: 'kitchen_sink', name: '싱크대 상판·도어', cat: 'sink' },
    { id: 'kitchen_faucet', name: '수전', cat: 'faucet' },
    { id: 'kitchen_hood', name: '가스레인지·후드', cat: 'hood' },
  ]},
  { id: 'bath', name: '욕실', items: [
    { id: 'bath_tile', name: '타일·줄눈', cat: 'tile' },
    { id: 'bath_fan', name: '환풍기', cat: 'fan' },
    { id: 'bath_toilet', name: '세면대·변기', cat: 'toilet' },
  ]},
  { id: 'room', name: '방', items: [
    { id: 'room_wall', name: '벽지(도배)', cat: 'wallpaper' },
    { id: 'room_floor', name: '바닥(장판)', cat: 'floor' },
    { id: 'room_closet', name: '붙박이장·문', cat: 'closet' },
  ]},
];

/* 감가상각 참고값 — 내용연수(년)·신규 시공비(원). 서비스 탑재 전 분쟁조정 사례/감정 기준 검증 필요 */
BG.DEPREC = {
  wallpaper: { name: '도배(벽지)', life: 6, cost: 600000 },
  floor:     { name: '장판',       life: 8, cost: 500000 },
  screen:    { name: '방충망',     life: 5, cost: 150000 },
  sink:      { name: '싱크대',     life: 10, cost: 450000 },
  faucet:    { name: '수전',       life: 5, cost: 120000 },
  hood:      { name: '레인지후드', life: 8, cost: 250000 },
  tile:      { name: '욕실 타일',  life: 15, cost: 300000 },
  fan:       { name: '환풍기',     life: 5, cost: 80000 },
  toilet:    { name: '위생도기',   life: 15, cost: 350000 },
  closet:    { name: '붙박이장·문', life: 8, cost: 400000 },
};
