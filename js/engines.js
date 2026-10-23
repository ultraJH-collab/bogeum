/* 보금 — 계산 엔진 (시세 · HUG/등기 · 중개보수 · 감가상각 · 해시) */
window.BG = window.BG || {};

(function () {
  const C = BG.CONST;

  /* ---------- 공통 유틸 ---------- */
  function seedOf(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const round = (v, u = 1) => Math.round(v / u) * u;

  /* 만원 → "1억 8,000" */
  function fmtMan(v) {
    v = Math.round(v);
    if (v === 0) return '0';
    const neg = v < 0; v = Math.abs(v);
    const eok = Math.floor(v / 10000), man = v % 10000;
    let s = '';
    if (eok) s += eok + '억';
    if (man) s += (eok ? ' ' : '') + man.toLocaleString('ko-KR');
    return (neg ? '-' : '') + s;
  }
  /* 지도 마커용 짧은 표기 "1.8억" / "3000/55" */
  function shortPrice(l) {
    if (l.deal === '월세') return `${l.deposit.toLocaleString()}/${l.rent}`;
    return l.deposit >= 10000 ? (l.deposit / 10000).toFixed(l.deposit % 10000 ? 1 : 0).replace(/\.0$/, '') + '억' : l.deposit.toLocaleString();
  }
  const fmtWon = (v) => Math.round(v).toLocaleString('ko-KR') + '원';
  const pct = (v, d = 0) => (v * 100).toFixed(d) + '%';

  /* ---------- 모듈 1: 헤도닉 시세 엔진 ---------- */
  // 기준 단위가격(basePerM2)은 [3층·2015년식·승강기 없음] 기준 ㎡당 매매가
  function factors(u) {
    let f = 1;
    if (u.floor <= 0) f *= 0.80;               // 반지하
    else if (u.floor === 1) f *= 0.93;         // 1층
    else if (u.floor === u.floors) f *= 0.97;  // 탑층(누수·단열)
    f *= 1 - 0.008 * (2015 - u.year);          // 연식 ±0.8%/년
    if (u.elevator > 0) f *= 1.04;             // 승강기
    if (u.violation) f *= 0.82;                // 위반건축물 할인
    return f;
  }

  function comps(l) {
    const r = rng(seedOf(l.id));
    const n = 10 + Math.floor(r() * 6);
    const list = [];
    for (let i = 0; i < n; i++) {
      const floors = 4 + Math.floor(r() * 3);
      const c = {
        dist: round(60 + r() * 440, 10),
        monthsAgo: Math.floor(r() * 12),
        area: round(l.area * (0.75 + r() * 0.5), 0.1),
        floors,
        floor: Math.floor(r() * floors) + (r() < 0.08 ? 0 : 1),
        year: l.year - 6 + Math.floor(r() * 12),
        elevator: r() < 0.5 ? 1 : 0,
        violation: false,
      };
      const trend = 1 - 0.002 * c.monthsAgo;           // 월 +0.2% 상승 추세
      const noise = 0.92 + r() * 0.16;
      c.price = round(l.basePerM2 * c.area * factors(c) * trend * noise, 50);
      c.trend = trend;
      list.push(c);
    }
    return list.sort((a, b) => b.monthsAgo - a.monthsAgo);
  }

  function estimate(l) {
    const cs = comps(l);
    const tf = factors(l);
    let wsum = 0, vsum = 0;
    cs.forEach((c) => {
      // 비교사례를 대상 호실 조건으로 보정: ㎡당 가격 / 비교사례 요인 × 대상 요인 / 시점보정
      c.adjusted = (c.price / c.area) / factors(c) / c.trend * tf * l.area;
      const w = (1 / (1 + c.dist / 150)) * (1 / (1 + c.monthsAgo / 6));
      wsum += w; vsum += w * c.adjusted;
    });
    const sale = round(vsum / wsum, 50);
    const sd = Math.sqrt(cs.reduce((s, c) => s + (c.adjusted - sale) ** 2, 0) / cs.length);
    const jeonse = round(sale * l.jeonseRatio, 50);
    // 호가를 전세로 환산하여 괴리율 산출
    const askJeonse = l.deal === '월세' ? l.deposit + (l.rent * 12) / (C.MARKET_CONV_RATE / 100) : l.deposit;
    const gapPct = (askJeonse - jeonse) / jeonse;
    const legalRate = C.BASE_RATE + C.LEGAL_CONV_SPREAD;
    const fairRent = l.deal === '월세' ? Math.max(0, round(((jeonse - l.deposit) * C.MARKET_CONV_RATE / 100) / 12, 1)) : 0;
    return {
      comps: cs, sale, saleLow: round(sale - sd, 50), saleHigh: round(sale + sd, 50),
      jeonse, jeonseLow: round(jeonse * 0.95, 50), jeonseHigh: round(jeonse * 1.05, 50),
      askJeonse, gapPct, legalRate, marketRate: C.MARKET_CONV_RATE, fairRent,
      confidence: Math.max(55, Math.min(94, Math.round(100 - (sd / sale) * 220 + cs.length))),
    };
  }

  /* ---------- 모듈 2: HUG 126% + 등기 권리분석 ---------- */
  function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }

  function seniorDebt(l) { return l.eul.filter((e) => /근저당|전세권/.test(e.type)).reduce((s, e) => s + e.amount, 0); }

  function hug(l, depositOverride) {
    const deposit = depositOverride != null ? depositOverride : l.deposit;
    const priceBasis = l.type === '오피스텔' ? '국세청 기준시가' : l.type === '다가구' ? '개별단독주택 공시가격(건물 전체)' : '공동주택 공시가격';
    const limit = round(l.officialPrice * C.HUG_MULTIPLIER, 1);
    const debt = seniorDebt(l);
    const senior = debt + (l.seniorLease || 0);
    const total = deposit + senior;
    const maxSafeDeposit = Math.max(0, limit - senior);
    const pass = !l.violation && total <= limit;
    const margin = (limit - total) / limit;
    return { deposit, limit, debt, seniorLease: l.seniorLease || 0, senior, total, maxSafeDeposit, pass, margin, priceBasis,
      depositOnlyPass: deposit <= limit };
  }

  // 판정 단계: 0 안전, 1 주의, 2 위험
  function diagnose(l, est) {
    est = est || estimate(l);
    const h = hug(l);
    const items = [];
    const add = (key, title, level, detail) => items.push({ key, title, level, detail });

    // 1) HUG 126%
    if (l.violation) add('hug', 'HUG 전세보증 가입', 2, '위반건축물은 보증 가입 및 전세대출이 불가합니다.');
    else if (!h.pass) add('hug', 'HUG 전세보증 가입', 2, `보증금+선순위 ${fmtMan(h.total)} > 한도 ${fmtMan(h.limit)}` + (h.depositOnlyPass ? ' (보증금만 보면 통과하지만 선순위 채권 합산 시 초과)' : ''));
    else if (h.margin < 0.08) add('hug', 'HUG 전세보증 가입', 1, `가입 가능하나 한도 여유 ${pct(h.margin, 1)}로 공시가 하락 시 갱신 거절 위험`);
    else add('hug', 'HUG 전세보증 가입', 0, `가입 가능 · 한도 ${fmtMan(h.limit)} 중 ${fmtMan(h.total)} 사용`);

    // 2) 깡통 지수 (보증금+선순위)/시세
    const value = l.type === '다가구' ? l.buildingValue : est.sale;
    const exposure = l.type === '다가구' ? h.total : h.total;
    const ratio = exposure / value;
    add('ratio', '깡통전세 지수', ratio > 0.8 ? 2 : ratio > 0.7 ? 1 : 0,
      `(보증금+선순위) ÷ ${l.type === '다가구' ? '건물 추정가' : 'AI 매매 시세'} = ${pct(ratio)}` + (ratio > 0.8 ? ' — 경매 시 보증금 손실 가능' : ''));

    // 3) 위반건축물
    add('violation', '건축물대장 위반 여부', l.violation ? 2 : 0, l.violation ? (l.violationNote || '위반건축물 표기') : '위반건축물 표기 없음');

    // 4) 갑구 위험 권리
    const trust = l.gap.find((g) => g.flag === '신탁');
    const seizure = l.gap.find((g) => /압류|가압류|경매/.test(g.type));
    if (trust) add('gap', '갑구 소유권 위험', 2, `신탁등기(${trust.who}) — 신탁사 동의 없는 임대차는 대항력 주장이 어려움`);
    else if (seizure) add('gap', '갑구 소유권 위험', 2, `${seizure.type} 등기 존재`);
    else add('gap', '갑구 소유권 위험', 0, '신탁·가압류·압류·경매 등기 없음');

    // 5) 최근 소유권 이전 (바지사장 의심)
    const ownDays = daysBetween(l.ownerSince, C.TODAY);
    if (ownDays < 180 && /법인/.test(l.ownerType)) add('owner', '최근 소유자 변경', 2, `${ownDays}일 전 ${l.ownerType}로 이전 — 다주택 법인 명의변경(바지사장) 패턴 의심`);
    else if (ownDays < 180) add('owner', '최근 소유자 변경', 1, `${ownDays}일 전 소유권 이전 — 매매 경위 확인 필요`);
    else add('owner', '최근 소유자 변경', 0, `${Math.floor(ownDays / 365)}년 이상 보유`);

    // 6) 임차권등기명령 이력
    add('lease', '임차권등기명령 이력', l.leaseOrder ? 2 : 0, l.leaseOrder ? '이전 세입자가 보증금을 돌려받지 못한 이력' : '이력 없음');

    // 7) 세금 체납
    add('tax', '임대인 국세·지방세', l.taxArrears ? 2 : 0, l.taxArrears ? '체납 확인 — 조세채권이 보증금보다 우선 변제될 수 있음' : '납세증명서 확인 (주임법 제3조의7)');

    // 8) 다가구 선순위 임차인
    if (l.type === '다가구') add('senior', '선순위 임차보증금', 1, `${l.units}세대 중 선순위 보증금 합계 ${fmtMan(l.seniorLease)} — 확정일자부여현황 열람 필수`);

    const level = Math.max(...items.map((i) => i.level));
    const score = Math.max(0, 100 - items.reduce((s, i) => s + [0, 12, 35][i.level], 0));
    return { items, level, score, hug: h, ratio, est };
  }

  /* ---------- 중개보수 (2021.10.19 시행 요율, 주택 임대차) ---------- */
  function brokerFee(depositMan, rentMan) {
    let base = depositMan + (rentMan || 0) * 100;
    if (rentMan && base < 5000) base = depositMan + rentMan * 70;
    const won = base * 10000;
    const table = [
      [5000, 0.005, 200000], [10000, 0.004, 300000], [60000, 0.003, null],
      [120000, 0.004, null], [150000, 0.005, null], [Infinity, 0.006, null],
    ];
    const [, rate, cap] = table.find((t) => base < t[0]);
    const fee = cap ? Math.min(won * rate, cap) : won * rate;
    return { base, rate, fee: Math.round(fee), withVat: Math.round(fee * 1.1) };
  }

  /* ---------- 모듈 4: 감가상각 ---------- */
  function liability(cat, cost, years, judgment) {
    const d = BG.DEPREC[cat];
    if (judgment !== 'tenant') return { residual: 0, pay: 0 };
    const residual = Math.max(0, 1 - years / d.life);
    return { residual, pay: Math.round(cost * residual) };
  }

  /* ---------- SHA-256 (crypto.subtle 우선, 미지원 환경 폴백) ---------- */
  function hex(buf) { return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join(''); }
  function sha256Fallback(bytes) {
    const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const len = bytes.length, bitLen = len * 8;
    const padded = new Uint8Array(((len + 9 + 63) >> 6) << 6);
    padded.set(bytes); padded[len] = 0x80;
    const dv = new DataView(padded.buffer);
    dv.setUint32(padded.length - 4, bitLen >>> 0); dv.setUint32(padded.length - 8, Math.floor(bitLen / 4294967296));
    const W = new Uint32Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < padded.length; o += 64) {
      for (let i = 0; i < 16; i++) W[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(W[i-15], 7) ^ rotr(W[i-15], 18) ^ (W[i-15] >>> 3);
        const s1 = rotr(W[i-2], 17) ^ rotr(W[i-2], 19) ^ (W[i-2] >>> 10);
        W[i] = (W[i-16] + s0 + W[i-7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
        const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }
  async function sha256(input) {
    const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
    try {
      if (window.crypto && crypto.subtle) return hex(await crypto.subtle.digest('SHA-256', bytes));
    } catch (e) { /* 폴백 */ }
    return sha256Fallback(bytes);
  }
  // 해시 목록 → 머클 루트
  async function merkleRoot(hashes) {
    if (!hashes.length) return null;
    let level = hashes.slice();
    while (level.length > 1) {
      const next = [];
      for (let i = 0; i < level.length; i += 2) next.push(await sha256(level[i] + (level[i + 1] || level[i])));
      level = next;
    }
    return level[0];
  }

  BG.eng = { seedOf, rng, round, fmtMan, fmtWon, shortPrice, pct, factors, comps, estimate, hug, seniorDebt, diagnose, brokerFee, liability, sha256, merkleRoot, daysBetween };
})();
