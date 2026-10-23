/* 보금 — 앱 (해시 라우팅 · 뷰 · 액션) */
(function () {
  const E = BG.eng;
  const C = BG.CONST;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const acc = () => BG.account || {};

  /* ---------- 저장소 (실패해도 동작 · 로그인 시 BG.account가 서버로 동기화) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('bg_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    put(k, v) { try { localStorage.setItem('bg_' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    set(k, v) { const ok = store.put(k, v); if (acc().push) acc().push(k, v); return ok; },
    clear() { try { Object.keys(localStorage).filter((k) => k.startsWith('bg_') && k !== 'bg_session').forEach((k) => localStorage.removeItem(k)); } catch (e) { /* noop */ } },
  };

  const defaultVault = () => ({ in: {}, out: {}, judg: {}, cost: {}, moveIn: '2024-11-01', moveOut: '2026-10-31', claim: 800000 });
  const state = {
    filters: { deal: 'all', room: 'all', safeOnly: false, q: '' },
    selected: null,
    vaultTab: 'in',
    hugDeposit: {},
    fee: { deposit: 18000, rent: 0 },
    manual: { type: '다세대', official: 18000, deposit: 20000, debt: 3000, seniorLease: 0 },
    auth: { mode: 'login', busy: false, error: '' },
    review: { text: '', out: '', busy: false, error: '' },
  };
  function reloadState() {
    Object.assign(state, {
      favs: store.get('favs', []), unlocked: store.get('unlocked', []), freeUsed: store.get('freeUsed', false),
      care: store.get('care', false), ct: store.get('ct', null), vault: store.get('vault', defaultVault()),
    });
  }
  reloadState();

  /* ---------- 엔진 결과 메모 ---------- */
  const memo = {};
  const L = (id) => BG.LISTINGS.find((l) => l.id === id);
  function diag(l) { return memo[l.id] || (memo[l.id] = E.diagnose(l, E.estimate(l))); }
  const LV = [
    { key: 'safe', label: '안전', long: '안심 매물' },
    { key: 'warn', label: '주의', long: '확인 필요' },
    { key: 'danger', label: '위험', long: '계약 비권장' },
  ];

  /* ---------- 아이콘 ---------- */
  const P = {
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    back: '<path d="m15 5-7 7 7 7"/>',
    right: '<path d="m9 5 7 7-7 7"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    alert: '<path d="M12 3 2 21h20z"/><path d="M12 10v5M12 18v.01"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    heart: '<path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    building: '<path d="M4 21V5l8-2v18M12 8l8 2v11M8 8h.01M8 12h.01M8 16h.01M16 13h.01M16 17h.01M2 21h20"/>',
    print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    hash: '<path d="M5 9h15M4 15h15M10 3 8 21M16 3l-2 18"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    spark: '<path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z"/>',
    cloud: '<path d="M7 18a5 5 0 0 1-.6-9.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/>',
    logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  };
  const ic = (n, s = 20, cls = '') => `<svg class="ic ${cls}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

  /* ---------- 공통 UI ---------- */
  function toast(msg, kind = '') {
    const t = $('#toast');
    t.className = 'toast show ' + kind; t.textContent = msg;
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.className = 'toast'), 2400);
  }
  function modal(html) {
    const root = $('#modal-root');
    root.innerHTML = `<div class="modal-bg" data-act="closeModal"></div><div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
    root.classList.add('open');
    const f = root.querySelector('button, input'); if (f) f.focus();
  }
  function closeModal() { const r = $('#modal-root'); r.classList.remove('open'); r.innerHTML = ''; }

  function pagehead(title, opts = {}) {
    return `<header class="pagehead">
      ${opts.back ? `<button class="icon-btn" data-act="back" aria-label="뒤로">${ic('back', 22)}</button>` : ''}
      <div class="ph-text"><h1>${title}</h1>${opts.sub ? `<p>${opts.sub}</p>` : ''}</div>
      ${opts.right || ''}
    </header>`;
  }
  const badge = (lv, txt) => `<span class="badge ${LV[lv].key}"><i></i>${txt || LV[lv].label}</span>`;
  const priceText = (l) => (l.deal === '월세' ? `월세 ${E.fmtMan(l.deposit)} / ${l.rent}` : `전세 ${E.fmtMan(l.deposit)}`);
  const pyeong = (m2) => (m2 / 3.3058).toFixed(1);
  const fmtDate = (d) => { const x = new Date(d); return `${x.getFullYear()}.${String(x.getMonth() + 1).padStart(2, '0')}.${String(x.getDate()).padStart(2, '0')}`; };
  const fmtDT = (d) => { const x = new Date(d); return `${fmtDate(x)} ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}:${String(x.getSeconds()).padStart(2, '0')}`; };
  const shortHash = (h) => (h ? h.slice(0, 8) + '…' + h.slice(-6) : '-');

  /* 안심점수 도장 — 이 앱의 단 하나의 강한 시각 요소 */
  function stamp(score, lv, size = 132) {
    const id = 'st' + Math.random().toString(36).slice(2, 7);
    const ring = '보금 안심진단 · ' + fmtDate(C.TODAY) + ' · 보금 안심진단 · ';
    return `<svg class="stamp ${LV[lv].key}" width="${size}" height="${size}" viewBox="0 0 140 140" role="img" aria-label="안심점수 ${score}점, ${LV[lv].label}">
      <defs>
        <path id="${id}p" d="M70 70m-52 0a52 52 0 1 1 104 0a52 52 0 1 1-104 0"/>
        <filter id="${id}f"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${score}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.75 1.3"/><feComposite in="SourceGraphic" operator="in"/></filter>
      </defs>
      <g filter="url(#${id}f)">
        <circle cx="70" cy="70" r="66" class="st-ring" stroke-width="4"/>
        <circle cx="70" cy="70" r="44" class="st-ring" stroke-width="1.6"/>
        <text class="st-around"><textPath href="#${id}p" startOffset="0">${ring}</textPath></text>
        <text x="70" y="78" text-anchor="middle" class="st-num">${score}</text>
        <text x="70" y="98" text-anchor="middle" class="st-lbl">${LV[lv].label}</text>
      </g>
    </svg>`;
  }

  function facade(l, cls = '') {
    const h = l.hue, floors = Math.min(l.floors, 6);
    const top = 136 - floors * 18 - 8;
    let wins = '';
    for (let f = 0; f < floors; f++) for (let c = 0; c < 3; c++) {
      const lit = E.seedOf(l.id + f + c) % 3 === 0;
      wins += `<rect x="${44 + c * 26}" y="${136 - (f + 1) * 18 + 3}" width="16" height="10" fill="${lit ? '#F4E3A1' : 'rgba(255,255,255,.7)'}"/>`;
    }
    return `<svg class="facade ${cls}" viewBox="0 0 160 160" preserveAspectRatio="${cls === 'big' ? 'xMidYMax meet' : 'xMidYMid slice'}" aria-hidden="true">
      <rect width="160" height="160" fill="hsl(${h},18%,90%)"/>
      <rect x="32" y="${top}" width="96" height="${136 - top}" fill="hsl(${h},14%,58%)"/>
      <rect x="28" y="${top - 4}" width="104" height="6" fill="hsl(${h},16%,40%)"/>
      ${wins}
      <rect x="72" y="122" width="16" height="14" fill="hsl(${h},18%,32%)"/>
      <rect y="136" width="160" height="24" fill="hsl(${h},10%,80%)"/>
      <rect x="12" y="120" width="4" height="16" fill="#5E7B67"/><circle cx="14" cy="114" r="9" fill="#7C9A84"/>
    </svg>`;
  }

  /* ---------- 찾기 (지도 + 목록) ---------- */
  function filtered() {
    const f = state.filters, q = f.q.trim();
    return BG.LISTINGS.filter((l) => {
      if (f.deal !== 'all' && l.deal !== f.deal) return false;
      if (f.room !== 'all' && (f.room === '오피스텔' ? l.type !== '오피스텔' : l.rooms !== f.room)) return false;
      if (f.safeOnly && diag(l).level > 0) return false;
      if (q && !(l.name + l.addr + l.dong + l.type).includes(q)) return false;
      return true;
    });
  }

  function mapSvg() {
    return `<svg class="map-svg" viewBox="0 0 400 260" preserveAspectRatio="none" aria-hidden="true">
      <rect width="400" height="260" class="m-land"/>
      <path d="M300 260 C310 215 345 190 400 196 V260z" class="m-park"/>
      <path d="M0 0 H70 C60 30 30 38 0 36z" class="m-park"/>
      <g class="m-block">${Array.from({ length: 34 }, (_, i) => { const r = E.rng(i + 7); return `<rect x="${(r() * 380).toFixed(0)}" y="${(r() * 240).toFixed(0)}" width="${(10 + r() * 22).toFixed(0)}" height="${(8 + r() * 14).toFixed(0)}"/>`; }).join('')}</g>
      <path d="M0 150 C70 128 120 168 190 140 S320 120 400 150" class="m-river" stroke-width="9" fill="none"/>
      <g class="m-road" stroke-linecap="round" fill="none">
        <path d="M0 100 C100 95 200 110 400 92" stroke-width="7"/>
        <path d="M120 0 C125 80 110 170 140 260" stroke-width="7"/>
        <path d="M270 0 C260 90 290 170 280 260" stroke-width="6"/>
        <path d="M0 205 C120 200 230 215 330 190" stroke-width="5"/>
        <path d="M40 0 L70 260" stroke-width="3.5"/><path d="M190 0 L210 260" stroke-width="3.5"/><path d="M330 0 L360 180" stroke-width="3.5"/>
      </g>
      <path d="M0 70 L104 57 L180 42 L248 31 L400 14" class="m-line" stroke-width="3.5" fill="none"/>
      <g class="m-stn" stroke-width="2.5"><circle cx="104" cy="57" r="4.5"/><circle cx="180" cy="42" r="4.5"/><circle cx="248" cy="31" r="4.5"/></g>
      <g class="m-stn-t" font-size="8.5" font-weight="600"><text x="84" y="73">신림역</text><text x="162" y="58">봉천역</text><text x="226" y="22">서울대입구역</text></g>
      <g class="m-label" font-size="9" font-weight="500">
        <text x="40" y="128">신림동</text><text x="218" y="88">봉천동</text><text x="20" y="84">서원동</text><text x="318" y="182">남현동</text>
        <text x="150" y="160">도림천</text><text x="345" y="236">관악산</text>
      </g>
    </svg>`;
  }

  function markerHtml(l) {
    const d = diag(l);
    return `<button class="pin ${LV[d.level].key} ${state.selected === l.id ? 'sel' : ''}" style="left:${l.x}%;top:${l.y}%" data-act="pick" data-arg="${l.id}" aria-label="${esc(l.name)} ${priceText(l)} ${LV[d.level].label}">
      <b>${E.shortPrice(l)}</b><small>${LV[d.level].label}</small></button>`;
  }

  function cardHtml(l) {
    const d = diag(l), gap = d.est.gapPct;
    const gapTag = Math.abs(gap) < 0.03 ? '<span class="tag">시세 적정</span>' : gap < 0 ? `<span class="tag good">시세보다 ${E.pct(-gap)} 낮음</span>` : `<span class="tag bad">시세보다 ${E.pct(gap)} 높음</span>`;
    const fav = state.favs.includes(l.id);
    return `<article class="lcard ${state.selected === l.id ? 'sel' : ''}" id="card-${l.id}" data-go="#/listing/${l.id}">
      <div class="lc-thumb">${facade(l)}</div>
      <div class="lc-body">
        <div class="lc-top">${badge(d.level)}<span class="lc-score">${d.score}점</span></div>
        <div class="lc-price">${priceText(l)}</div>
        <div class="lc-name">${esc(l.name)} · ${l.dong}</div>
        <div class="lc-meta">${l.rooms} · ${l.floor}/${l.floors}층 · ${l.area}㎡ · 관리비 ${l.fee}만</div>
        <div class="tags">${d.hug.pass ? '<span class="tag good">HUG 가입가능</span>' : '<span class="tag bad">HUG 불가</span>'}${gapTag}</div>
      </div>
      <button class="fav ${fav ? 'on' : ''}" data-act="fav" data-arg="${l.id}" aria-label="찜" aria-pressed="${fav}">${ic('heart', 20)}</button>
    </article>`;
  }

  function viewHome() {
    const f = state.filters;
    const chip = (key, val, label) => `<button class="chip ${f[key] === val ? 'on' : ''}" data-act="filter" data-key="${key}" data-val="${val}" aria-pressed="${f[key] === val}">${label}</button>`;
    const all = BG.LISTINGS.map(diag);
    return `<div class="home">
      <section class="home-intro">
        <h1>계약하기 전에,<br>이 집의 서류부터 봅니다.</h1>
        <p>관악구 빌라 ${BG.LISTINGS.length}곳의 등기·보증·시세를 미리 확인했어요. 안심 ${all.filter((d) => d.level === 0).length}곳, 주의 ${all.filter((d) => d.level === 1).length}곳, 위험 ${all.filter((d) => d.level === 2).length}곳입니다.</p>
      </section>
      <div class="home-tools">
        <label class="search">${ic('search', 18)}<input id="q" type="search" placeholder="동네, 역, 건물명 (예: 신림, 봉천)" value="${esc(f.q)}" autocomplete="off" aria-label="매물 검색"></label>
        <div class="chips" role="group" aria-label="필터">
          ${chip('deal', 'all', '전체')}${chip('deal', '전세', '전세')}${chip('deal', '월세', '월세')}
          <span class="chip-sep"></span>
          ${chip('room', '원룸', '원룸')}${chip('room', '투룸', '투룸')}${chip('room', '쓰리룸', '쓰리룸+')}${chip('room', '오피스텔', '오피스텔')}
          <button class="chip safe ${f.safeOnly ? 'on' : ''}" data-act="safeOnly" aria-pressed="${f.safeOnly}">${ic('shield', 14)}안심만</button>
        </div>
      </div>
      <div class="home-split">
        <div class="map-wrap" id="map">
          <div class="map-layer" id="map-layer">${mapSvg()}<div id="markers"></div></div>
          <div class="map-note">관악구 · 데모 지도 · 끌어서 이동</div>
        </div>
        <div class="list-col">
          <div class="list-head" id="list-head"></div>
          <div class="list" id="home-list"></div>
        </div>
      </div>
    </div>`;
  }
  function refreshHomeList() {
    const items = filtered();
    const safeN = items.filter((l) => diag(l).level === 0).length;
    $('#markers').innerHTML = items.map(markerHtml).join('');
    $('#list-head').innerHTML = `<b>${items.length}곳</b><span>안심 ${safeN} · 확인 필요 ${items.length - safeN}</span>`;
    $('#home-list').innerHTML = items.length ? items.map(cardHtml).join('') : `<div class="empty"><p>조건에 맞는 집이 없어요. 필터를 줄여 보세요.</p><button class="btn ghost sm" data-act="resetFilter">필터 초기화</button></div>`;
  }
  function initMap() {
    const wrap = $('#map'), layer = $('#map-layer');
    if (!wrap) return;
    let pos = state.mapPos || null;
    const bounds = () => ({ w: wrap.clientWidth, h: wrap.clientHeight, lw: layer.offsetWidth, lh: layer.offsetHeight });
    const clamp = (p) => { const b = bounds(); return { x: Math.min(0, Math.max(b.w - b.lw, p.x)), y: Math.min(0, Math.max(b.h - b.lh, p.y)) }; };
    const apply = () => { layer.style.transform = `translate(${pos.x}px,${pos.y}px)`; state.mapPos = pos; };
    if (!pos) { const b = bounds(); pos = { x: (b.w - b.lw) / 2, y: (b.h - b.lh) / 2 }; }
    pos = clamp(pos); apply();
    if (wrap.dataset.bound) return;
    wrap.dataset.bound = '1';
    let start = null;
    wrap.addEventListener('pointerdown', (e) => { start = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y, moved: false }; });
    wrap.addEventListener('pointermove', (e) => {
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!start.moved && Math.hypot(dx, dy) > 6) { start.moved = true; wrap.setPointerCapture(e.pointerId); wrap.classList.add('dragging'); }
      if (start.moved) { pos = clamp({ x: start.px + dx, y: start.py + dy }); apply(); }
    });
    const end = () => { if (start && start.moved) state.mapDragged = Date.now(); start = null; wrap.classList.remove('dragging'); };
    wrap.addEventListener('pointerup', end); wrap.addEventListener('pointercancel', end);
  }

  /* ---------- 매물 상세 ---------- */
  function compChart(l, est) {
    const W = 340, H = 180, pd = { l: 40, r: 10, t: 12, b: 24 };
    const vals = est.comps.map((c) => c.adjusted).concat([est.saleLow, est.saleHigh, est.jeonse, est.askJeonse]);
    const min = Math.min(...vals) * 0.93, max = Math.max(...vals) * 1.04;
    const x = (m) => pd.l + ((11 - m) / 11) * (W - pd.l - pd.r);
    const y = (v) => pd.t + (1 - (v - min) / (max - min)) * (H - pd.t - pd.b);
    const ticks = [0, 1, 2, 3].map((i) => min + ((max - min) * i) / 3);
    const months = [11, 8, 5, 2, 0].map((m) => { const d = new Date(C.TODAY); d.setMonth(d.getMonth() - m); return { m, label: m === 0 ? '현재' : `${d.getMonth() + 1}월` }; });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="최근 12개월 실거래와 AI 적정 범위">
      ${ticks.map((t) => `<line x1="${pd.l}" x2="${W - pd.r}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${pd.l - 6}" y="${y(t) + 3}" text-anchor="end" class="axis">${(t / 10000).toFixed(1)}억</text>`).join('')}
      ${months.map((mo) => `<text x="${x(mo.m)}" y="${H - 6}" text-anchor="middle" class="axis">${mo.label}</text>`).join('')}
      <rect x="${pd.l}" width="${W - pd.l - pd.r}" y="${y(est.saleHigh)}" height="${y(est.saleLow) - y(est.saleHigh)}" class="band"/>
      <line x1="${pd.l}" x2="${W - pd.r}" y1="${y(est.sale)}" y2="${y(est.sale)}" class="sale-line"/>
      <line x1="${pd.l}" x2="${W - pd.r}" y1="${y(est.jeonse)}" y2="${y(est.jeonse)}" class="jeonse-line"/>
      <line x1="${pd.l}" x2="${W - pd.r}" y1="${y(est.askJeonse)}" y2="${y(est.askJeonse)}" class="ask-line"/>
      ${est.comps.map((c) => `<circle cx="${x(c.monthsAgo) + ((c.dist % 7) - 3)}" cy="${y(c.adjusted)}" r="3.6" class="pt"><title>${c.monthsAgo}개월 전 · ${c.dist}m · ${c.floor}층 · ${c.year}년 → 보정 ${E.fmtMan(c.adjusted)}</title></circle>`).join('')}
    </svg>
    <div class="legend"><span><i class="lg-pt"></i>주변 실거래(보정)</span><span><i class="lg-band"></i>적정 매매 범위</span><span><i class="lg-jeonse"></i>적정 전세</span><span><i class="lg-ask"></i>호가${l.deal === '월세' ? '(전세 환산)' : ''}</span></div>`;
  }

  function rangeBar(lo, hi, val, labelVal) {
    const min = Math.min(lo, val) * 0.9, max = Math.max(hi, val) * 1.08;
    const p = (v) => ((v - min) / (max - min)) * 100;
    return `<div class="rangebar">
      <div class="rb-track"><div class="rb-fair" style="left:${p(lo)}%;width:${p(hi) - p(lo)}%"></div>
      <div class="rb-pin" style="left:${p(val)}%"><span>${labelVal}</span></div></div>
      <div class="rb-labels"><span style="left:${p(lo)}%">${E.fmtMan(lo)}</span><span style="left:${p(hi)}%">${E.fmtMan(hi)}</span></div>
    </div>`;
  }

  function viewListing(id) {
    const l = L(id); if (!l) return viewNotFound();
    const d = diag(l), est = d.est, h = d.hug;
    const fee = E.brokerFee(l.deposit, l.rent);
    const saving = fee.withVat - 39000;
    const fav = state.favs.includes(l.id);
    const gap = est.gapPct;
    const issues = d.items.filter((i) => i.level);
    const spec = [
      ['전용면적', `${l.area}㎡ (${pyeong(l.area)}평)`], ['해당층 / 전체', `${l.floor}층 / ${l.floors}층`],
      ['사용승인', `${l.year}년 (${C.TODAY.getFullYear() - l.year}년차)`], ['주용도', l.type === '근린생활시설' ? '제2종 근린생활시설' : l.type === '오피스텔' ? '업무시설(오피스텔)' : `공동주택(${l.type})`],
      ['승강기', l.elevator ? `${l.elevator}대` : '없음'], ['주차', `${l.parking}대`],
    ];
    return `<div class="detail">
      <div class="d-hero" style="--h:${l.hue}">${facade(l, 'big')}
        <div class="d-hero-bar">
          <button class="icon-btn glass" data-act="back" aria-label="뒤로">${ic('back', 22)}</button>
          <button class="icon-btn glass fav ${fav ? 'on' : ''}" data-act="fav" data-arg="${l.id}" aria-label="찜" aria-pressed="${fav}">${ic('heart', 20)}</button>
        </div>
      </div>
      <div class="d-grid">
      <aside class="d-side">
        <section class="d-head">
          <div class="d-type">${l.type} · ${l.deal} · 매물번호 BG-${l.id.toUpperCase()}${4821 + l.x * 7}</div>
          <h1 class="d-price">${priceText(l)}</h1>
          <div class="d-addr">${esc(l.name)}<br>${esc(l.addr)}</div>
          <div class="tags">${l.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}${l.landlordVerified ? '<span class="tag good">집주인 본인인증</span>' : '<span class="tag">집주인 미인증</span>'}</div>
        </section>
        <a class="verdict ${LV[d.level].key}" href="#/check/${l.id}">
          ${stamp(d.score, d.level, 112)}
          <div class="v-body"><strong>${LV[d.level].long}</strong>
            <span>${issues.length ? issues.slice(0, 3).map((i) => esc(i.title)).join(', ') + ' 항목을 확인하세요.' : '8개 위험 항목을 모두 통과했어요.'}</span>
            <em>진단 리포트 보기 ${ic('right', 14)}</em></div>
        </a>
        <section class="save">
          <div class="save-row"><div><small>공인중개사 법정 상한 보수</small><s>${E.fmtWon(fee.withVat)}</s></div>
          <div><small>보금 안심 직거래</small><b>39,000원</b></div></div>
          <p>${saving > 0 ? `최대 ${E.fmtWon(saving)} 절약 · ` : ''}거래금액 ${E.fmtMan(fee.base)} × ${(fee.rate * 100).toFixed(1)}% (VAT 포함, 일방)</p>
        </section>
        <div class="cta-bar">
          <a class="btn line" href="#/check/${l.id}">${ic('shield', 18)}안심진단</a>
          <button class="btn primary" data-act="startContract" data-arg="${l.id}">${ic('doc', 18)}직거래 계약하기</button>
        </div>
      </aside>
      <div class="d-main">
        <section class="sec">
          <div class="sec-h"><h2>AI 시세</h2><span class="muted sm">신뢰도 ${est.confidence}% · 비교 ${est.comps.length}건</span></div>
          <div class="kv2">
            <div><small>적정 전세</small><b>${E.fmtMan(est.jeonseLow)} ~ ${E.fmtMan(est.jeonseHigh)}</b></div>
            <div><small>적정 매매</small><b>${E.fmtMan(est.sale)}</b></div>
          </div>
          ${rangeBar(est.jeonseLow, est.jeonseHigh, est.askJeonse, l.deal === '월세' ? '호가(환산)' : '호가')}
          <p class="gap-note ${gap > 0.05 ? 'bad' : gap < -0.03 ? 'good' : ''}">
            ${l.deal === '월세' ? `전세 환산 ${E.fmtMan(est.askJeonse)} 기준, ` : ''}호가가 적정가보다 <b>${gap >= 0 ? '+' : ''}${E.pct(gap, 1)}</b>. ${gap > 0.05 ? '비싸게 나왔어요. 협상 여지가 있습니다.' : gap < -0.03 ? '싸게 나왔어요. 싼 이유(권리·하자)를 꼭 확인하세요.' : '적정 수준이에요.'}
          </p>
          ${l.deal === '월세' ? `<div class="mini-grid">
            <div><small>시장 전환율</small><b>${est.marketRate}%</b></div>
            <div><small>법정 상한(갱신 시)</small><b>${est.legalRate.toFixed(1)}%</b></div>
            <div><small>적정 월세</small><b>${est.fairRent}만</b></div></div>` : ''}
          <div class="chart-box">${compChart(l, est)}</div>
          <details class="fold"><summary>반경 500m 비교 실거래 ${est.comps.length}건</summary>
            <div class="tbl-wrap"><table class="tbl"><thead><tr><th>시점</th><th>거리</th><th>층·연식</th><th>면적</th><th>거래가</th><th>보정가</th></tr></thead><tbody>
            ${est.comps.slice().sort((a, b) => a.monthsAgo - b.monthsAgo).map((c) => `<tr><td>${c.monthsAgo ? c.monthsAgo + '개월 전' : '이번 달'}</td><td>${c.dist}m</td><td>${c.floor || '반지하'}층·${c.year}</td><td>${c.area}㎡</td><td>${E.fmtMan(c.price)}</td><td><b>${E.fmtMan(c.adjusted)}</b></td></tr>`).join('')}
            </tbody></table></div>
            <p class="fine">헤도닉 보정: 층(1층 −7%, 반지하 −20%, 탑층 −3%), 연식(±0.8%/년), 승강기(+4%), 위반건축물(−18%), 시점(+0.2%/월). 거리·시점 역가중 평균. 데모 데이터입니다.</p>
          </details>
        </section>
        <section class="sec">
          <div class="sec-h"><h2>건축물대장 표제부</h2><span class="muted sm">국토부 API 연동 예정</span></div>
          ${l.violation ? `<div class="alert danger">${ic('alert', 18)}<div><b>위반건축물</b><p>${esc(l.violationNote)}. HUG 보증과 전세대출이 거절됩니다.</p></div></div>` : ''}
          <dl class="spec">${spec.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
        </section>
        <section class="sec">
          <div class="sec-h"><h2>HUG 126% 간이 진단</h2></div>
          <div class="hug-mini ${h.pass ? 'ok' : 'no'}">
            <div><small>보증 한도</small><b>${E.fmtMan(h.limit)}</b></div>
            <div><small>보증금 + 선순위</small><b>${E.fmtMan(h.total)}</b></div>
            <div><small>안전 최대 보증금</small><b>${E.fmtMan(h.maxSafeDeposit)}</b></div>
          </div>
          <a class="btn ghost block" href="#/check/${l.id}">정밀 진단 리포트 보기 ${ic('right', 16)}</a>
        </section>
      </div>
      </div>
    </div>`;
  }

  /* ---------- 안심 진단 ---------- */
  function hugBlock(l, deposit) {
    const h = E.hug(l, deposit);
    const scale = Math.max(h.limit, h.total) * 1.12;
    const w = (v) => (v / scale) * 100;
    const ok = h.pass;
    return `<div class="hug-bar">
        <div class="hb-track">
          ${h.debt ? `<div class="hb-seg hb-debt" style="width:${w(h.debt)}%"></div>` : ''}
          ${h.seniorLease ? `<div class="hb-seg hb-lease" style="width:${w(h.seniorLease)}%"></div>` : ''}
          <div class="hb-seg hb-dep ${ok ? '' : 'over'}" style="width:${w(h.deposit)}%"></div>
          <div class="hb-limit" style="left:${w(h.limit)}%"><span>한도 ${E.fmtMan(h.limit)}</span></div>
        </div>
        <div class="hb-legend">${h.debt ? `<span><i class="hb-debt"></i>근저당 ${E.fmtMan(h.debt)}</span>` : ''}${h.seniorLease ? `<span><i class="hb-lease"></i>선순위 보증금 ${E.fmtMan(h.seniorLease)}</span>` : ''}<span><i class="hb-dep"></i>보증금 ${E.fmtMan(h.deposit)}</span></div>
      </div>
      <div class="formula">
        <div><span>${h.priceBasis}</span><b>${E.fmtMan(l.officialPrice)}</b></div>
        <div><span>× 126% (주택가격 140% × 담보인정 90%)</span><b>= ${E.fmtMan(h.limit)}</b></div>
        <div><span>선순위 합계 (채권최고액${h.seniorLease ? ' + 선순위 보증금' : ''})</span><b>− ${E.fmtMan(h.senior)}</b></div>
        <div class="sum"><span>보증 가능한 최대 보증금</span><b>${E.fmtMan(h.maxSafeDeposit)}</b></div>
      </div>
      <div class="result ${ok ? 'ok' : 'no'}">${ic(ok ? 'check' : 'alert', 18)}<div>${l.violation ? '위반건축물이라 금액과 무관하게 가입할 수 없어요' : ok ? `보증 가입 가능 · 여유 ${E.fmtMan(h.limit - h.total)}` : `보증 가입 불가 · ${E.fmtMan(h.total - h.limit)} 초과`}${!ok && h.depositOnlyPass && !l.violation ? '<em>보증금만 보면 통과하지만, 선순위 채권을 합치면 탈락하는 경우예요.</em>' : ''}</div></div>`;
  }

  function reviewBox(l) {
    const r = state.review, a = acc();
    const sample = l
      ? (l.eul.length ? '잔금일에 은행 대출 조금 더 받을 예정인데 보증금이랑은 상관없으니 걱정 마세요. 특약은 표준계약서에 있는 걸로 충분하고, 전입신고는 제가 사정이 있어 2주 뒤에 해 주시면 좋겠어요.' : '집은 신탁회사 명의로 되어 있는데 실제 주인은 저라서 계약은 저랑 하시면 됩니다. 계약금은 제 개인 계좌로 오늘 안에 보내 주세요.')
      : '보증금은 잔금일 전에 먼저 절반 보내 주시면 키를 드릴게요. 근저당은 곧 갚을 거라 특약에 안 넣어도 됩니다.';
    if (!a.user) return `<section class="sec ai-review">
      <div class="sec-h"><h2>${ic('spark', 18)}AI 문구 검토</h2></div>
      <p class="muted">집주인 문자나 특약 문구를 붙여넣으면 세입자에게 불리한 부분과 고쳐 쓸 문구를 알려드려요.</p>
      <a class="btn line" href="#/login">로그인하고 사용하기</a>
    </section>`;
    return `<section class="sec ai-review">
      <div class="sec-h"><h2>${ic('spark', 18)}AI 문구 검토</h2><button class="link" data-act="reviewSample" data-q="${esc(sample)}">예시 넣기</button></div>
      <p class="muted sm">집주인 문자, 계약서 특약, 중개사 설명을 붙여넣으세요.${l ? ' 이 집의 진단 결과도 함께 참고해요.' : ''}</p>
      <textarea id="review-text" rows="5" maxlength="6000" placeholder="예: 잔금일에 대출을 조금 더 받을 예정인데 걱정 마세요…" aria-label="검토할 문구">${esc(r.text)}</textarea>
      <button class="btn primary" data-act="review" data-arg="${l ? l.id : ''}" ${r.busy ? 'disabled' : ''}>${r.busy ? '<span class="spin"></span>검토하는 중' : '검토하기'}</button>
      <div id="review-out" class="ai-out ${r.out || r.error ? '' : 'hidden'} ${r.error ? 'err' : ''}" aria-live="polite">${r.error ? esc(r.error) : BG.ai ? BG.ai.md(r.out) : ''}</div>
    </section>`;
  }

  function viewCheck(id) {
    if (!id) return viewCheckHub();
    const l = L(id); if (!l) return viewNotFound();
    const d = diag(l);
    const unlocked = state.unlocked.includes(l.id);
    const dep = state.hugDeposit[l.id] != null ? state.hugDeposit[l.id] : l.deposit;
    const sliderMax = Math.max(Math.round(E.hug(l).limit * 1.3 / 500) * 500, l.deposit + 5000);
    const recs = BG.CLAUSES.filter((c) => c.id !== 'c6' || l.type === '다가구');
    return `${pagehead('안심 진단 리포트', { back: true, sub: `${esc(l.name)} · ${esc(l.addr)}` })}
    <div class="page">
      <section class="report-top ${LV[d.level].key}">
        ${stamp(d.score, d.level, 150)}
        <div><h2>${LV[d.level].long}</h2>
          <p>${d.items.filter((i) => i.level === 0).length}개 항목 통과, ${d.items.filter((i) => i.level).length}개 항목 확인 필요. 진단 기준일 ${fmtDate(C.TODAY)} · 데모 데이터</p></div>
      </section>
      <div class="cols">
      <div>
      <section class="sec">
        <div class="sec-h"><h2>HUG 전세보증 126% 판정</h2></div>
        <div id="hug-block">${hugBlock(l, dep)}</div>
        <label class="slider-label" for="dep-slider">희망 보증금으로 다시 계산 <b id="dep-val">${E.fmtMan(dep)}</b></label>
        <input id="dep-slider" type="range" class="slider" min="0" max="${sliderMax}" step="500" value="${dep}" data-input="hugDeposit" data-arg="${l.id}">
      </section>
      <section class="sec">
        <div class="sec-h"><h2>8대 위험 체크리스트</h2><span class="muted sm">${d.items.filter((i) => i.level === 0).length} / ${d.items.length} 통과</span></div>
        <ol class="checklist">${d.items.map((i) => `<li class="${LV[i.level].key}"><div><b>${i.title}</b><p>${esc(i.detail)}</p></div>${badge(i.level)}</li>`).join('')}</ol>
      </section>
      </div>
      <div>
      ${reviewBox(l)}
      <section class="sec ${unlocked ? '' : 'locked'}">
        <div class="sec-h"><h2>등기부 권리분석</h2><span class="muted sm">인터넷등기소 연계 예정</span></div>
        <div class="${unlocked ? '' : 'blur'}" ${unlocked ? '' : 'aria-hidden="true"'}>
          <h3 class="sub">갑구 · 소유권</h3>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>접수일</th><th>등기목적</th><th>원인</th><th>권리자</th></tr></thead><tbody>
          ${l.gap.map((g) => `<tr class="${g.flag ? 'hl' : ''}"><td>${fmtDate(g.date)}</td><td>${g.type}</td><td>${g.cause}</td><td>${esc(g.who)}</td></tr>`).join('')}</tbody></table></div>
          <h3 class="sub">을구 · 소유권 외 권리</h3>
          ${l.eul.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>접수일</th><th>등기목적</th><th>채권최고액</th><th>권리자</th></tr></thead><tbody>
          ${l.eul.map((e) => `<tr class="hl"><td>${fmtDate(e.date)}</td><td>${e.type}</td><td>${E.fmtMan(e.amount)}</td><td>${esc(e.who)}</td></tr>`).join('')}</tbody></table></div>
          <p class="fine">채권최고액은 보통 실제 대출액의 120~130%예요. 경매가 열리면 보증금보다 먼저 배당됩니다.</p>` : '<p class="muted sm">기록 없음 · 근저당과 전세권 설정이 없어요</p>'}
          <div class="ratio-box"><span>총 부채비율 (보증금+선순위 ÷ 시세)</span><b class="c-${d.ratio > 0.8 ? 'danger' : d.ratio > 0.7 ? 'warn' : 'safe'}">${E.pct(d.ratio)}</b></div>
        </div>
        ${unlocked ? '' : `<div class="lock-cta">${ic('lock', 22)}<b>정밀 권리분석</b><p>갑구·을구 원문, 부채비율, 맞춤 특약</p>
          <button class="btn primary" data-act="unlock" data-arg="${l.id}">${state.freeUsed ? '4,900원 결제하고 열기' : '첫 1회 무료로 열기'}</button></div>`}
      </section>
      <section class="sec ${unlocked ? '' : 'locked'}">
        <div class="sec-h"><h2>안심 특약 ${recs.length}종</h2>${unlocked ? `<button class="link" data-act="copyAll" data-arg="${l.id}">${ic('copy', 15)}전체 복사</button>` : ''}</div>
        <div class="${unlocked ? '' : 'blur'}" ${unlocked ? '' : 'aria-hidden="true"'}>
          ${recs.map((c, i) => `<div class="clause"><div class="cl-h"><b>${i + 1}. ${c.title}</b><button class="icon-btn sm" data-act="copy" data-arg="${c.id}" aria-label="${c.title} 복사">${ic('copy', 16)}</button></div><p>${c.text}</p></div>`).join('')}
          <p class="fine">데모 문구예요. 실제 계약에 쓰기 전에 변호사 감수를 받아야 하며, 개별 사안에 대한 법률 자문이 아닙니다.</p>
        </div>
      </section>
      <section class="sec care">
        <div><b>2년 안심케어 · 등기 감시</b><p>살고 있는 동안 근저당·압류·소유권 변동을 매일 확인해 알려드려요.</p></div>
        <button class="btn ${state.care ? 'line' : 'primary'} sm" data-act="toggleCare">${state.care ? '구독 중' : '월 1,900원'}</button>
      </section>
      </div>
      </div>
      <div class="cta-inline"><button class="btn primary block" data-act="startContract" data-arg="${l.id}">${ic('doc', 18)}이 집으로 직거래 계약 시작</button></div>
    </div>`;
  }

  function viewCheckHub() {
    const m = state.manual;
    return `${pagehead('안심 진단', { sub: '보증보험 가입 여부와 위험 권리를 계약 전에 확인해요' })}
    <div class="page">
      <div class="cols">
      <div>
      <section class="sec">
        <div class="sec-h"><h2>이 전세, 보증보험 가입될까?</h2><span class="muted sm">단위: 만원</span></div>
        <p class="muted sm">공시가 × 126% 한도에 근저당과 선순위 보증금까지 합쳐서 판정해요.</p>
        <div class="form">
          <label>주택 유형<select data-input="manual" data-key="type">${['다세대', '연립', '다가구', '오피스텔'].map((t) => `<option ${m.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
          <label>${m.type === '오피스텔' ? '국세청 기준시가' : m.type === '다가구' ? '개별단독주택 공시가 (건물 전체)' : '공동주택 공시가격'}<input type="number" inputmode="numeric" value="${m.official}" data-input="manual" data-key="official"></label>
          <label>희망 보증금<input type="number" inputmode="numeric" value="${m.deposit}" data-input="manual" data-key="deposit"></label>
          <label>선순위 근저당 채권최고액 (등기부 을구)<input type="number" inputmode="numeric" value="${m.debt}" data-input="manual" data-key="debt"></label>
          ${m.type === '다가구' ? `<label>선순위 임차보증금 합계<input type="number" inputmode="numeric" value="${m.seniorLease}" data-input="manual" data-key="seniorLease"></label>` : ''}
        </div>
        <div id="manual-result">${manualResult()}</div>
      </section>
      </div>
      <div>
      ${reviewBox(null)}
      <section class="sec">
        <div class="sec-h"><h2>주변 매물 바로 진단</h2></div>
        <div class="rows">${BG.LISTINGS.map((l) => { const d = diag(l); return `<a class="row" href="#/check/${l.id}"><div><b>${esc(l.name)}</b><small>${l.dong} · ${priceText(l)}</small></div>${badge(d.level)}${ic('right', 16, 'muted')}</a>`; }).join('')}</div>
      </section>
      </div>
      </div>
    </div>`;
  }
  function manualResult() {
    const m = state.manual;
    const pseudo = { type: m.type, officialPrice: +m.official || 0, eul: m.debt ? [{ type: '근저당권설정', amount: +m.debt }] : [], seniorLease: m.type === '다가구' ? +m.seniorLease || 0 : 0, violation: false };
    return hugBlock(pseudo, +m.deposit || 0);
  }

  /* ---------- 안심 직거래 계약 ---------- */
  const CT_STEPS = ['본인인증', '계약조건', '안심특약', '서명·봉인', '에스크로'];
  function newContract(l) {
    const d = diag(l);
    const bal = '2026-11-30';
    return {
      listingId: l.id, step: 0, tenantOk: false, landlordOk: l.landlordVerified, riskAck: d.level < 2,
      form: { tenant: acc().user ? acc().user.username : '김민수', deposit: l.deposit, rent: l.rent, down: Math.round(l.deposit * 0.1), balanceDate: bal, start: bal, months: 24, escrowAll: true, daepil: false },
      clauses: BG.CLAUSES.filter((c) => c.id !== 'c6' || l.type === '다가구').map((c) => c.id),
      sig: null, hash: null, tsa: null, sealedAt: null,
      escrow: { stage: 0, alert: false, log: [] },
    };
  }
  function saveCt() { store.set('ct', state.ct); }

  function viewContract(id) {
    let ct = state.ct;
    if (id && (!ct || ct.listingId !== id) && L(id)) { state.ct = ct = newContract(L(id)); saveCt(); }
    if (!ct) {
      return `${pagehead('안심 직거래', { sub: '중개보수 대신 39,000원 · 본인인증부터 에스크로까지' })}
      <div class="page">
        <section class="sec"><ol class="steps-intro">${CT_STEPS.map((s) => `<li>${s}</li>`).join('')}</ol></section>
        <section class="sec"><div class="sec-h"><h2>계약할 집을 고르세요</h2></div>
          <div class="rows">${BG.LISTINGS.map((l) => { const d = diag(l); return `<button class="row" data-act="startContract" data-arg="${l.id}"><div><b>${esc(l.name)}</b><small>${priceText(l)} · ${l.landlordVerified ? '집주인 인증 완료' : '집주인 미인증'}</small></div>${badge(d.level)}${ic('right', 16, 'muted')}</button>`; }).join('')}</div>
        </section>
      </div>`;
    }
    const l = L(ct.listingId);
    const body = [ctAuth, ctTerms, ctClauses, ctSign, ctEscrow][ct.step](l, ct);
    return `${pagehead('안심 직거래 계약', { back: true, right: `<button class="link sm" data-act="resetContract">처음부터</button>` })}
      <ol class="stepper" aria-label="계약 단계">${CT_STEPS.map((s, i) => `<li class="${i < ct.step ? 'done' : i === ct.step ? 'cur' : ''}" ${i === ct.step ? 'aria-current="step"' : ''}><span>${i < ct.step ? ic('check', 12) : i + 1}</span><small>${s}</small></li>`).join('')}</ol>
      <div class="page ct">
        <div class="ct-target">${facade(l, 'mini')}<div><b>${esc(l.name)}</b><small>${priceText(l)} · ${esc(l.addr)}</small></div>${badge(diag(l).level)}</div>
        ${body}
      </div>`;
  }

  function ctAuth(l, ct) {
    const trust = l.ownerType === '신탁회사';
    const corp = /법인/.test(l.ownerType);
    const d = diag(l);
    const canNext = ct.tenantOk && ct.landlordOk && !trust && ct.riskAck;
    return `<section class="sec">
      <div class="sec-h"><h2>당사자 실명인증</h2></div>
      <div class="party"><div><small>임차인 (나)</small><b>${ct.tenantOk ? esc(ct.form.tenant) + ' · 인증 완료' : '인증이 필요해요'}</b></div>
        ${ct.tenantOk ? `<span class="ok-pill">${ic('check', 14)}완료</span>` : `<div class="btn-row"><button class="btn pass sm" data-act="auth" data-arg="tenant">PASS</button><button class="btn kakao sm" data-act="auth" data-arg="tenant">카카오</button></div>`}</div>
      <div class="party"><div><small>임대인</small><b>${ct.landlordOk ? esc(l.owner) + ' · 인증 완료' : '인증 대기 중'}</b></div>
        ${ct.landlordOk ? `<span class="ok-pill">${ic('check', 14)}완료</span>` : `<button class="btn line sm" data-act="auth" data-arg="landlord">인증 요청 보내기</button>`}</div>
    </section>
    <section class="sec">
      <div class="sec-h"><h2>실소유주 일치 검증</h2></div>
      <div class="match ${trust ? 'no' : 'ok'}">
        <div><small>등기부 갑구 소유자</small><b>${esc(l.owner)}</b><em>${l.ownerType}</em></div>
        <div class="vs">${ic(trust ? 'x' : 'check', 18)}</div>
        <div><small>본인인증 명의</small><b>${ct.landlordOk ? esc(trust ? l.gap[0].who : l.owner) : '-'}</b><em>${trust ? '위탁자' : '임대인'}</em></div>
      </div>
      ${trust ? `<div class="alert danger">${ic('alert', 18)}<div><b>계약을 진행할 수 없어요</b><p>신탁등기 주택은 등기상 소유자가 신탁회사입니다. 신탁원부 확인과 신탁사·우선수익자 동의서 없이는 임대차 효력을 주장하기 어려워요.</p></div></div>` : ''}
      ${corp && !trust ? `<div class="alert warn">${ic('alert', 18)}<div><b>법인 임대인 추가 확인</b><p>법인등기부, 대표자 본인 여부, 인감증명서, 법인 보유 주택 수와 최근 명의변경 경위를 확인하세요.</p></div></div>` : ''}
    </section>
    ${d.level === 2 && !trust ? `<section class="sec"><div class="alert danger">${ic('alert', 18)}<div><b>위험 판정을 받은 집이에요</b><p>${d.items.filter((i) => i.level === 2).map((i) => i.title).join(', ')}. 진행 전에 진단 리포트를 확인하세요.</p></div></div>
      <label class="check-row"><input type="checkbox" data-act="riskAck" ${ct.riskAck ? 'checked' : ''}> 위험 내용을 확인했고 제 판단으로 진행합니다</label></section>` : ''}
    <div class="ct-nav"><button class="btn primary block" data-act="ctNext" ${canNext ? '' : 'disabled'}>다음</button></div>`;
  }

  function ctTerms(l, ct) {
    const f = ct.form;
    const fee = E.brokerFee(f.deposit, f.rent);
    const total = 39000 + (f.daepil ? 50000 : 0);
    return `<section class="sec form">
      <div class="sec-h"><h2>계약 조건</h2><span class="muted sm">주택임대차표준계약서 기준</span></div>
      <label>임차인 성명<input value="${esc(f.tenant)}" data-input="ctForm" data-key="tenant"></label>
      <div class="grid2">
        <label>보증금 (만원)<input type="number" inputmode="numeric" value="${f.deposit}" data-input="ctForm" data-key="deposit"></label>
        <label>월차임 (만원)<input type="number" inputmode="numeric" value="${f.rent}" data-input="ctForm" data-key="rent"></label>
        <label>계약금 (만원)<input type="number" inputmode="numeric" value="${f.down}" data-input="ctForm" data-key="down"></label>
        <label>잔금일 · 입주일<input type="date" value="${f.balanceDate}" data-input="ctForm" data-key="balanceDate"></label>
      </div>
      <label>계약기간<select data-input="ctForm" data-key="months">${[12, 24].map((m) => `<option value="${m}" ${+f.months === m ? 'selected' : ''}>${m}개월 (${m === 24 ? '주임법 최단기간' : '1년 · 임차인은 2년 주장 가능'})</option>`).join('')}</select></label>
    </section>
    <section class="sec">
      <div class="sec-h"><h2>에스크로 예치 범위</h2></div>
      <label class="radio-card ${!f.escrowAll ? 'on' : ''}"><input type="radio" name="esc" data-act="escrowAll" data-arg="0" ${!f.escrowAll ? 'checked' : ''}><div><b>계약금만 예치</b><p>${E.fmtMan(f.down)}만원 · 대항력 확인 후 정산</p></div></label>
      <label class="radio-card ${f.escrowAll ? 'on' : ''}"><input type="radio" name="esc" data-act="escrowAll" data-arg="1" ${f.escrowAll ? 'checked' : ''}><div><b>계약금 + 잔금 예치 <span class="tag good">권장</span></b><p>잔금일 당일 근저당을 설정하는 '잔금 사기'까지 막아요</p></div></label>
    </section>
    <section class="sec">
      <label class="check-row big"><input type="checkbox" data-act="daepil" ${f.daepil ? 'checked' : ''}><div><b>안심 대필 5만원 (지역 협약 공인중개사)</b><p>비대면이 불안하면 공인중개사가 계약서를 검수·날인해 드려요.</p></div></label>
    </section>
    <section class="sec bill">
      <div><span>전자계약 · 에스크로 이용료</span><b>39,000원</b></div>
      ${f.daepil ? '<div><span>안심 대필 파트너스</span><b>50,000원</b></div>' : ''}
      <div class="sum"><span>합계</span><b>${E.fmtWon(total)}</b></div>
      <div class="cmp"><span>법정 상한 중개보수 (VAT 포함)</span><s>${E.fmtWon(fee.withVat)}</s></div>
      <p class="fine">이용료는 중개 알선 대가가 아니라 전자문서·에스크로 솔루션 이용료(SaaS)입니다. 보금은 가격 협상과 알선에 관여하지 않습니다.</p>
    </section>
    <div class="ct-nav two"><button class="btn line" data-act="ctPrev">이전</button><button class="btn primary" data-act="ctNext">다음</button></div>`;
  }

  function ctClauses(l, ct) {
    const list = BG.CLAUSES.filter((c) => c.id !== 'c6' || l.type === '다가구');
    return `<section class="sec">
      <div class="sec-h"><h2>안심 특약 선택</h2><span class="muted sm">${ct.clauses.length}개 선택</span></div>
      ${list.map((c) => `<label class="clause pick ${ct.clauses.includes(c.id) ? 'on' : ''}"><input type="checkbox" data-act="clause" data-arg="${c.id}" ${ct.clauses.includes(c.id) ? 'checked' : ''}><div><b>${c.title}</b><p>${c.text}</p></div></label>`).join('')}
      <p class="fine">데모 문구예요. 실서비스는 변호사 감수본을 사용합니다.</p>
    </section>
    <div class="ct-nav two"><button class="btn line" data-act="ctPrev">이전</button><button class="btn primary" data-act="ctNext">계약서 확인</button></div>`;
  }

  function contractDoc(l, ct) {
    const f = ct.form;
    const end = new Date(f.start); end.setMonth(end.getMonth() + +f.months); end.setDate(end.getDate() - 1);
    const clauses = BG.CLAUSES.filter((c) => ct.clauses.includes(c.id));
    return `<div class="paper">
      <h2>주택임대차 전자계약서</h2>
      <p class="paper-sub">국토교통부 주택임대차표준계약서 양식 준용 · 보금</p>
      <table class="ptbl">
        <tr><th>소재지</th><td colspan="3">${esc(l.addr)} ${esc(l.name)}</td></tr>
        <tr><th>구조·용도</th><td>${l.type}</td><th>면적</th><td>${l.area}㎡</td></tr>
        <tr><th>보증금</th><td>금 ${E.fmtMan(f.deposit)}만원정</td><th>차임</th><td>${+f.rent ? `월 ${f.rent}만원` : '없음'}</td></tr>
        <tr><th>계약금</th><td>${E.fmtMan(f.down)}만원 (에스크로)</td><th>잔금</th><td>${E.fmtMan(f.deposit - f.down)}만원 · ${fmtDate(f.balanceDate)}</td></tr>
        <tr><th>임대기간</th><td colspan="3">${fmtDate(f.start)} ~ ${fmtDate(end)} (${f.months}개월)</td></tr>
        <tr><th>임대인</th><td>${esc(l.owner)}</td><th>임차인</th><td>${esc(f.tenant)}</td></tr>
      </table>
      <h4>특약사항</h4>
      <ol>${clauses.map((c) => `<li>${c.text}</li>`).join('')}</ol>
      <p class="fine">본 계약은 전자문서 및 전자거래 기본법, 전자서명법에 따라 체결되며 잔금 후 30일 이내 주택임대차 신고(보증금 6천만원 초과 또는 월차임 30만원 초과)가 필요합니다.</p>
    </div>`;
  }

  function ctSign(l, ct) {
    if (ct.hash) {
      return `<section class="sec">
        <div class="sealed">${ic('lock', 26)}<div><b>계약서 봉인 완료</b><p>${fmtDT(ct.sealedAt)}</p></div></div>
        ${contractDoc(l, ct)}
        <div class="sig-pair"><div><small>임대인</small><div class="sig-img landlord">${esc(l.owner)}</div></div><div><small>임차인</small><img class="sig-img" src="${ct.sig}" alt="임차인 서명"></div></div>
        <div class="hash-box"><div><small>문서 해시 (SHA-256)</small><code>${ct.hash}</code></div><div><small>시점확인 토큰 (RFC 3161 TSA · 데모)</small><code>${ct.tsa}</code></div></div>
        <button class="btn ghost block sm" data-act="verifyHash">${ic('hash', 16)}무결성 다시 확인</button>
      </section>
      <div class="ct-nav"><button class="btn primary block" data-act="ctNext">에스크로 가상계좌 발급</button></div>`;
    }
    return `<section class="sec">${contractDoc(l, ct)}</section>
    <section class="sec">
      <div class="sec-h"><h2>임차인 전자서명</h2><button class="link" data-act="clearSig">지우기</button></div>
      <canvas id="sig" class="sig-pad" width="640" height="220" aria-label="서명 입력 영역"></canvas>
      <p class="fine">손가락이나 마우스로 서명하세요. 임대인은 별도 링크로 서명합니다(데모: 자동 서명).</p>
      <label class="check-row"><input type="checkbox" id="agree"> 계약 내용을 확인했고 전자서명의 효력에 동의합니다</label>
    </section>
    <div class="ct-nav two"><button class="btn line" data-act="ctPrev">이전</button><button class="btn primary" data-act="seal">서명하고 봉인</button></div>`;
  }

  function escrowStages(ct) {
    const f = ct.form;
    const bal = new Date(f.balanceDate);
    const next = new Date(bal); next.setDate(next.getDate() + 1);
    const s = [
      { t: '가상계좌 발급', d: '제휴 은행 에스크로 전용 계좌' },
      { t: `계약금 ${E.fmtMan(f.down)}만원 예치`, d: '임대인에게 바로 가지 않고 은행이 보관해요' },
    ];
    if (f.escrowAll) s.push({ t: `잔금 ${E.fmtMan(f.deposit - f.down)}만원 예치`, d: `${fmtDate(bal)} 잔금일` });
    s.push({ t: '입주 · 전입신고 · 확정일자', d: `${fmtDate(bal)} · 정부24나 주민센터에서 당일 처리` });
    s.push({ t: '대항력 발생', d: `${fmtDate(next)} 00:00 · 전입신고 다음 날 0시 (주임법 제3조)` });
    s.push({ t: '등기 무변동 확인 후 임대인 정산', d: '대항력이 생길 때까지 근저당 등 변동이 없으면 자동 지급' });
    return s;
  }

  function ctEscrow(l, ct) {
    const es = ct.escrow;
    const stages = escrowStages(ct);
    const done = es.stage >= stages.length - 1;
    const acct = '우리은행 1005-' + (E.seedOf(ct.hash || 'x') % 900 + 100) + '-' + String(E.seedOf(l.id) % 1000000).padStart(6, '0');
    return `<section class="sec">
      <div class="acct"><small>에스크로 가상계좌 (데모)</small><b>${acct}</b><span>예금주: 보금에스크로(${esc(l.owner)})</span><button class="link" data-act="copyText" data-arg="${acct}">${ic('copy', 14)}복사</button></div>
      ${es.alert ? `<div class="alert danger">${ic('alert', 20)}<div><b>등기 변동 감지 · 정산 자동 보류</b><p>${fmtDT(es.alertAt)} 을구에 근저당권설정(채권최고액 1억 2,000만원) 접수가 감지되어 알림을 보냈어요. 특약 1에 따라 계약 해제와 예치금 전액 반환을 청구할 수 있습니다.</p>
        <div class="btn-row"><button class="btn danger sm" data-act="refund">예치금 반환 요청</button><button class="btn line sm" data-act="clearAlert">정상 시나리오로</button></div></div></div>` : ''}
      <ol class="timeline">${stages.map((s, i) => `<li class="${i < es.stage || (done && i === es.stage) ? 'done' : i === es.stage ? 'cur' : ''} ${es.alert && i === es.stage ? 'hold' : ''}"><span class="tl-dot">${i < es.stage || (done && i === es.stage) ? ic('check', 12) : ''}</span><div><b>${s.t}</b><p>${s.d}</p></div></li>`).join('')}</ol>
      ${done ? `<div class="alert ok">${ic('check', 18)}<div><b>거래 완료</b><p>대항력과 등기 무변동이 확인되어 예치금이 임대인에게 정산됐어요. 30일 안에 임대차 신고를 하세요.</p></div></div>`
        : `<div class="btn-row wide"><button class="btn primary" data-act="escNext" ${es.alert ? 'disabled' : ''}>다음 단계 진행</button><button class="btn danger-line" data-act="escAlert" ${es.alert || es.stage < 1 ? 'disabled' : ''}>근저당 기습 시뮬레이션</button></div>`}
    </section>
    <section class="sec">
      <div class="sec-h"><h2>실시간 등기 감시 기록</h2><span class="muted sm">1시간 간격</span></div>
      <p class="fine">계약금 예치부터 전입 다음 날 0시 + 24시간까지 감시해요.</p>
      <ul class="log">${es.log.length ? es.log.slice().reverse().map((g) => `<li class="${g.bad ? 'bad' : ''}"><time>${fmtDT(g.t)}</time><span>${g.msg}</span></li>`).join('') : '<li class="muted">계약금을 예치하면 감시가 시작돼요.</li>'}</ul>
      ${done ? `<div class="care-up"><p>사는 2년 동안도 감시를 이어갈까요?</p><button class="btn ${state.care ? 'line' : 'primary'} sm" data-act="toggleCare">${state.care ? '안심케어 구독 중' : '안심케어 월 1,900원'}</button></div>` : ''}
    </section>
    <section class="sec">
      <div class="sec-h"><h2>다음 할 일</h2></div>
      <div class="rows">
        <a class="row" href="#/vault"><div><b>입주 사진 남기기</b><small>12개 지점 · 퇴거 분쟁 대비</small></div>${ic('right', 16, 'muted')}</a>
        <div class="row static"><div><b>주택임대차 신고</b><small>계약 후 30일 이내 · 신고하면 확정일자 자동 부여</small></div></div>
        <div class="row static"><div><b>전세보증금 반환보증 가입</b><small>HUG · HF · SGI · 잔금 후 신청</small></div></div>
      </div>
    </section>`;
  }

  /* ---------- 사진 금고 ---------- */
  function allItems() { return BG.ZONES.flatMap((z) => z.items.map((it) => ({ ...it, zone: z.name }))); }
  function residenceYears() { const v = state.vault; return Math.max(0, (new Date(v.moveOut) - new Date(v.moveIn)) / (365.25 * 86400000)); }
  function viewVault() {
    const v = state.vault, tab = state.vaultTab;
    const inN = Object.keys(v.in).length, outN = Object.keys(v.out).length;
    const tabs = [['in', `입주 ${inN}/12`], ['out', `퇴거 ${outN}/12`], ['dep', '감가상각'], ['rep', '리포트']];
    const body = tab === 'in' || tab === 'out' ? vaultSlots(tab) : tab === 'dep' ? vaultDeprec() : vaultReport();
    return `${pagehead('사진 금고', { sub: '입주 날 찍은 12장이 퇴거 날 보증금을 지켜요', right: `<button class="link sm" data-act="sampleFill">샘플 채우기</button>` })}
      <div class="seg" role="tablist">${tabs.map(([k, t]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" data-act="vaultTab" data-arg="${k}">${t}</button>`).join('')}</div>
      <div class="page">${body}</div>`;
  }
  function vaultSlots(phase) {
    const v = state.vault;
    const n = Object.keys(v[phase]).length;
    const head = phase === 'in'
      ? `<section class="sec intro"><p>사진마다 <b>원본 SHA-256 해시</b>와 촬영 시각을 봉인하고, 전체를 머클 루트 하나로 묶어 위·변조를 막아요.</p><div class="progress" role="progressbar" aria-valuenow="${n}" aria-valuemax="12"><i style="width:${(n / 12) * 100}%"></i></div><small class="muted">${n} / 12 완료</small></section>`
      : `<section class="sec intro"><p>입주 때와 같은 각도로 다시 찍고, 항목마다 <b>자연마모</b>인지 <b>임차인 과실</b>인지 고르세요. 자연마모는 배상 책임이 없어요.</p></section>`;
    return head + `<div class="zones">` + BG.ZONES.map((z) => `<section class="sec">
      <div class="sec-h"><h2>${z.name}</h2><span class="muted sm">${z.items.filter((it) => v[phase][it.id]).length} / 3</span></div>
      <div class="${phase === 'in' ? 'slots' : 'cmp-list'}">${z.items.map((it) => phase === 'in' ? slotHtml('in', it) : cmpRow(it)).join('')}</div>
    </section>`).join('') + `</div><p class="fine">${acc().user ? '로그인 상태라 사진 기록이 내 계정에 저장돼요.' : '로그인하면 사진 기록이 내 계정에 저장돼 다른 기기에서도 볼 수 있어요.'} 실서비스는 서버 수신 시각 + RFC 3161 TSA 토큰으로 봉인하고, 위·변조가 쉬운 EXIF는 증거 근거로 쓰지 않아요.</p>`;
  }
  function slotHtml(phase, it) {
    const s = state.vault[phase][it.id];
    if (s) return `<div class="slot filled"><img src="${s.img}" alt="${it.name}"><div class="slot-meta"><b>${it.name}</b><small>${fmtDT(s.ts)}</small><code>${shortHash(s.hash)}</code></div><button class="slot-x" data-act="delPhoto" data-phase="${phase}" data-arg="${it.id}" aria-label="${it.name} 사진 삭제">${ic('x', 14)}</button></div>`;
    return `<label class="slot"><input type="file" accept="image/*" capture="environment" data-phase="${phase}" data-slot="${it.id}" class="sr-only">${ic('camera', 24)}<b>${it.name}</b><small>눌러서 촬영</small></label>`;
  }
  function cmpRow(it) {
    const v = state.vault, a = v.in[it.id], j = v.judg[it.id] || 'none';
    return `<div class="cmp">
      <div class="cmp-h"><b>${it.name}</b><select data-input="judg" data-key="${it.id}" aria-label="${it.name} 판정">
        <option value="none" ${j === 'none' ? 'selected' : ''}>이상 없음</option>
        <option value="wear" ${j === 'wear' ? 'selected' : ''}>자연마모 (배상 0원)</option>
        <option value="tenant" ${j === 'tenant' ? 'selected' : ''}>임차인 과실</option></select></div>
      <div class="cmp-imgs"><div>${a ? `<img src="${a.img}" alt="${it.name} 입주 사진"><small>입주 ${fmtDate(a.ts)}</small>` : '<div class="noimg">입주 사진 없음</div>'}</div>
        <div>${slotHtml('out', it)}</div></div>
    </div>`;
  }
  function deprecRows() {
    const v = state.vault, yrs = residenceYears();
    return allItems().filter((it) => (v.judg[it.id] || 'none') !== 'none').map((it) => {
      const dp = BG.DEPREC[it.cat];
      const cost = v.cost[it.id] != null ? v.cost[it.id] : dp.cost;
      const j = v.judg[it.id];
      return { it, dp, cost, j, ...E.liability(it.cat, cost, yrs, j) };
    });
  }
  function vaultDeprec() {
    const v = state.vault, yrs = residenceYears();
    const rows = deprecRows();
    const total = rows.reduce((s, r) => s + r.pay, 0);
    const unfair = Math.max(0, (+v.claim || 0) - total);
    return `<section class="sec form">
      <div class="sec-h"><h2>거주 기간</h2><span class="muted sm">${yrs.toFixed(1)}년</span></div>
      <div class="grid2"><label>입주일<input type="date" value="${v.moveIn}" data-input="vault" data-key="moveIn"></label><label>퇴거일<input type="date" value="${v.moveOut}" data-input="vault" data-key="moveOut"></label></div>
    </section>
    <section class="sec">
      <div class="sec-h"><h2>항목별 배상 책임</h2></div>
      ${rows.length ? `<div class="dep-list">${rows.map((r) => `<div class="dep ${r.j}">
        <div class="dep-h"><b>${r.it.zone} · ${r.it.name}</b><span class="tag ${r.j === 'wear' ? 'good' : 'bad'}">${r.j === 'wear' ? '자연마모' : '임차인 과실'}</span></div>
        <div class="dep-calc"><label>신규 시공비<input type="number" inputmode="numeric" value="${r.cost}" data-input="cost" data-key="${r.it.id}"></label>
        <div><small>내용연수 ${r.dp.life}년 · 잔존가치</small><b>${r.j === 'wear' ? '해당 없음' : E.pct(r.residual)}</b></div>
        <div><small>임차인 부담</small><b class="c-${r.pay ? 'danger' : 'safe'}">${E.fmtWon(r.pay)}</b></div></div></div>`).join('')}</div>`
      : `<div class="empty"><p>퇴거 탭에서 이상이 있는 항목을 판정하면 여기서 계산돼요.</p><button class="btn ghost sm" data-act="vaultTab" data-arg="out">퇴거 탭으로</button></div>`}
      <p class="fine">부담액 = 신규 시공비 × max(0, 1 − 거주연수 ÷ 내용연수). 통상의 사용에 따른 손모는 임대인 부담입니다(민법 제615조·제654조). 내용연수는 참고값이며 분쟁조정 사례 기준 검증이 필요해요.</p>
    </section>
    <section class="sec">
      <div class="sec-h"><h2>집주인 공제 청구와 비교</h2></div>
      <label class="form">집주인이 빼겠다는 금액 (원)<input type="number" inputmode="numeric" value="${v.claim}" data-input="vault" data-key="claim"></label>
      <div class="vs-box"><div><small>집주인 청구</small><b>${E.fmtWon(+v.claim || 0)}</b></div><div><small>표준 산정 부담액</small><b>${E.fmtWon(total)}</b></div><div class="hl"><small>돌려받을 수 있는 금액</small><b>${E.fmtWon(unfair)}</b></div></div>
      <button class="btn primary block" data-act="vaultTab" data-arg="rep">${ic('doc', 18)}소명 리포트 만들기</button>
    </section>`;
  }
  function vaultReport() {
    const inN = Object.keys(state.vault.in).length;
    return `<section class="sec center">
      <h2>원상복구 소명 리포트</h2>
      <p class="muted">입주·퇴거 사진, 사진별 SHA-256 해시와 머클 루트, 감가상각 산정 결과를 한 장으로 정리해요. 분쟁조정위원회 신청이나 내용증명에 첨부할 수 있어요.</p>
      <div class="kv2"><div><small>입주 사진</small><b>${inN} / 12</b></div><div><small>판정 항목</small><b>${deprecRows().length}건</b></div></div>
      ${inN ? '<a class="btn primary block" href="#/report">리포트 열기 · PDF로 저장</a>' : '<button class="btn primary block" disabled>리포트 열기 · PDF로 저장</button><p class="fine">입주 사진을 1장 이상 등록해야 리포트를 만들 수 있어요.</p>'}
      <p class="fine">요금 9,900원 / 건 (데모에서는 무료)</p>
    </section>`;
  }
  function viewReport() {
    const v = state.vault, rows = deprecRows();
    const total = rows.reduce((s, r) => s + r.pay, 0);
    const ct = state.ct, l = ct ? L(ct.listingId) : null;
    const photos = allItems().filter((it) => v.in[it.id] || v.out[it.id]);
    return `${pagehead('퇴거 소명 리포트', { back: true, right: `<button class="btn line sm" data-act="print">${ic('print', 16)}인쇄 · PDF</button>` })}
    <div class="page report">
      <div class="paper">
        <h2>원상복구 범위 소명서</h2>
        <p class="paper-sub">보금 사진 금고 · 발급 ${fmtDT(new Date())}</p>
        <table class="ptbl">
          <tr><th>목적물</th><td colspan="3">${l ? esc(l.addr + ' ' + l.name) : '(계약 정보 없음)'}</td></tr>
          <tr><th>임차인</th><td>${ct ? esc(ct.form.tenant) : '-'}</td><th>임대인</th><td>${l ? esc(l.owner) : '-'}</td></tr>
          <tr><th>거주기간</th><td colspan="3">${fmtDate(v.moveIn)} ~ ${fmtDate(v.moveOut)} (${residenceYears().toFixed(1)}년)</td></tr>
          <tr><th>머클 루트</th><td colspan="3"><code id="root-hash">계산 중…</code></td></tr>
        </table>
        <h4>1. 사진 기록 대조</h4>
        <div class="rep-photos">${photos.map((it) => `<div class="rp"><b>${it.zone} · ${it.name}</b><div class="rp-imgs">
          ${['in', 'out'].map((ph) => { const s = v[ph][it.id]; return s ? `<figure><img src="${s.img}" alt=""><figcaption>${ph === 'in' ? '입주' : '퇴거'} ${fmtDT(s.ts)}<br><code>${s.hash}</code></figcaption></figure>` : `<figure class="none">${ph === 'in' ? '입주' : '퇴거'} 사진 없음</figure>`; }).join('')}
          </div><small>판정: ${{ none: '이상 없음', wear: '통상 손모(자연마모)', tenant: '임차인 과실' }[v.judg[it.id] || 'none']}</small></div>`).join('')}</div>
        <h4>2. 감가상각 산정</h4>
        ${rows.length ? `<table class="ptbl"><tr><th>항목</th><th>판정</th><th>내용연수</th><th>부담액</th></tr>
          ${rows.map((r) => `<tr><td>${r.it.zone} ${r.it.name}</td><td>${r.j === 'wear' ? '자연마모' : '과실'}</td><td>${r.dp.life}년</td><td>${E.fmtWon(r.pay)}</td></tr>`).join('')}
          <tr><th colspan="3">임차인 부담 합계</th><td><b>${E.fmtWon(total)}</b></td></tr>
          <tr><th colspan="3">임대인 공제 청구액</th><td>${E.fmtWon(+v.claim || 0)}</td></tr>
          <tr><th colspan="3">반환 청구 대상 (부당 공제분)</th><td><b>${E.fmtWon(Math.max(0, (+v.claim || 0) - total))}</b></td></tr></table>` : '<p>판정된 손상 항목 없음 · 원상복구 비용 공제 사유 없음.</p>'}
        <h4>3. 소명 요지</h4>
        <p>임차인은 입주 시점의 목적물 상태를 위와 같이 촬영·봉인하였으며, 각 사진의 해시값은 발급 이후 변경되지 않았습니다. 통상의 사용에 따른 손모는 임차인의 원상회복 의무 범위에 포함되지 않으므로, 위 산정액을 초과하는 공제분의 반환을 요청합니다.</p>
        <p class="fine">본 문서는 증빙 정리 도구의 출력물로 법률 자문이 아니며, 법적 효력은 제출 기관의 판단에 따릅니다. 데모 버전은 기기 시각을 사용합니다.</p>
      </div>
    </div>`;
  }

  /* ---------- 로그인 · 회원가입 (아이디/비밀번호만) ---------- */
  function viewLogin() {
    const a = acc(), s = state.auth;
    if (a.user) return viewMy();
    const signup = s.mode === 'signup';
    return `${pagehead(signup ? '회원가입' : '로그인', { sub: '아이디와 비밀번호만 있으면 돼요. 이메일 인증은 없어요.' })}
    <div class="page narrow">
      <div class="seg" role="tablist"><button role="tab" aria-selected="${!signup}" class="${!signup ? 'on' : ''}" data-act="authMode" data-arg="login">로그인</button><button role="tab" aria-selected="${signup}" class="${signup ? 'on' : ''}" data-act="authMode" data-arg="signup">회원가입</button></div>
      <form class="sec form auth" id="auth-form" novalidate>
        <label>아이디<input name="username" autocomplete="username" required minlength="4" maxlength="20" pattern="[a-z0-9_]{4,20}" placeholder="영문 소문자·숫자·_ 4~20자" autocapitalize="none" spellcheck="false"></label>
        <label>비밀번호<input name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" required minlength="8" maxlength="72" placeholder="8자 이상"></label>
        ${signup ? '<label>비밀번호 확인<input name="password2" type="password" autocomplete="new-password" required minlength="8" maxlength="72"></label>' : ''}
        <p class="form-err" id="auth-err" role="alert">${esc(s.error)}</p>
        <button class="btn primary block" type="submit" ${s.busy ? 'disabled' : ''}>${s.busy ? '<span class="spin"></span>' : ''}${signup ? '가입하고 시작하기' : '로그인'}</button>
      </form>
      <p class="fine center">로그인하면 찜, 계약 진행, 사진 금고, AI 상담 기록이 계정에 저장되고 AI 상담·문구 검토를 쓸 수 있어요.<br>비밀번호를 5번 틀리면 10분 동안 잠겨요. 비밀번호 찾기는 아직 없으니 잊지 않게 보관하세요.</p>
    </div>`;
  }

  /* ---------- 내 정보 ---------- */
  function viewMy() {
    const v = state.vault, ct = state.ct;
    const fee = E.brokerFee(+state.fee.deposit || 0, +state.fee.rent || 0);
    return `${pagehead('내 정보')}
    <div class="page">
      ${accountCard()}
      <section class="sec stats">
        <a href="#/contract"><b>${ct ? CT_STEPS[ct.step] : '없음'}</b><small>진행 중 계약</small></a>
        <button data-act="goVault"><b>${Object.keys(v.in).length} / 12</b><small>사진 금고</small></button>
        <a href="#/home"><b>${state.favs.length}곳</b><small>찜한 집</small></a>
      </section>
      ${state.favs.length ? `<section class="sec"><div class="sec-h"><h2>찜한 집</h2></div><div class="rows">${state.favs.map(L).filter(Boolean).map((l) => `<a class="row" href="#/listing/${l.id}"><div><b>${esc(l.name)}</b><small>${priceText(l)}</small></div>${badge(diag(l).level)}</a>`).join('')}</div></section>` : ''}
      <section class="sec care">
        <div><b>2년 안심케어</b><p>등기부 변동(근저당·압류·소유권 이전)을 매일 감시 · 월 1,900원</p></div>
        <button class="toggle ${state.care ? 'on' : ''}" data-act="toggleCare" role="switch" aria-checked="${state.care}" aria-label="안심케어 구독"><i></i></button>
      </section>
      <section class="sec form">
        <div class="sec-h"><h2>중개보수 계산기</h2><span class="muted sm">2021.10 개정 요율</span></div>
        <div class="grid2"><label>보증금 (만원)<input type="number" inputmode="numeric" value="${state.fee.deposit}" data-input="fee" data-key="deposit"></label><label>월세 (만원)<input type="number" inputmode="numeric" value="${state.fee.rent}" data-input="fee" data-key="rent"></label></div>
        <div id="fee-out">${feeOut(fee)}</div>
      </section>
      <section class="sec">
        <div class="sec-h"><h2>요금</h2></div>
        <dl class="price-list">
          <div><dt>안심 직거래 전자계약 + 에스크로</dt><dd>39,000원 / 건</dd></div>
          <div><dt>HUG 126% + 등기부 정밀 리포트</dt><dd>4,900원 / 건 · 첫 1회 무료</dd></div>
          <div><dt>원상복구 사진 금고 + 퇴거 리포트</dt><dd>9,900원 / 건</dd></div>
          <div><dt>2년 안심케어 (등기 감시)</dt><dd>월 1,900원</dd></div>
          <div><dt>안심 대필 파트너스 (선택)</dt><dd>50,000원</dd></div>
          <div><dt>AI 상담 · 문구 검토 (회원)</dt><dd>무료 · 하루 60회</dd></div>
        </dl>
      </section>
      <section class="sec">
        <button class="row" data-act="resetAll"><div><b>데모 데이터 초기화</b><small>계약·사진·찜·구독 상태를 모두 지워요</small></div>${ic('right', 16, 'muted')}</button>
      </section>
      <p class="fine center">보금 데모 · 모든 매물·등기·시세는 가상 데이터예요.<br>건축물대장·공시가격·실거래가·인터넷등기소·본인인증·은행 에스크로는 화면으로만 시뮬레이션합니다.</p>
    </div>`;
  }
  function accountCard() {
    const a = acc();
    if (!a.user) return `<section class="profile"><div class="avatar">${ic('user', 24)}</div><div class="grow"><b>로그인하고 계정에 저장하기</b><small>지금은 이 기기에만 저장돼요</small></div><a class="btn primary sm" href="#/login">로그인</a></section>`;
    const st = { syncing: '저장 중…', ok: '계정에 저장됨', error: '저장 실패 · ' + a.error, off: '' }[a.status] || '';
    return `<section class="profile"><div class="avatar on">${esc(a.user.username.slice(0, 1).toUpperCase())}</div><div class="grow"><b>${esc(a.user.username)}</b>
      <small class="${a.status === 'error' ? 'c-danger' : ''}">${ic('cloud', 13)} ${esc(st)}</small></div>
      ${a.status === 'error' ? `<button class="btn line sm" data-act="syncRetry">다시 시도</button>` : ''}<button class="btn line sm" data-act="logout">${ic('logout', 15)}로그아웃</button></section>`;
  }
  function feeOut(fee) {
    const save = fee.withVat - 39000;
    return `<div class="fee-out"><div><small>거래금액</small><b>${E.fmtMan(fee.base)}만</b></div><div><small>상한요율</small><b>${(fee.rate * 100).toFixed(1)}%</b></div><div><small>중개보수(VAT)</small><b>${E.fmtWon(fee.withVat)}</b></div></div>
      <p class="save-line">${save > 0 ? `보금 직거래로 ${E.fmtWon(save)} 아낄 수 있어요 (${E.pct(save / fee.withVat)})` : '이 금액대는 중개보수가 이용료보다 낮아요. 안심 진단만 이용해 보세요.'}</p>`;
  }

  function viewNotFound() { return `${pagehead('찾을 수 없는 페이지', { back: true })}<div class="page"><div class="empty"><p>주소가 바뀌었거나 없는 페이지예요.</p><a class="btn primary sm" href="#/home">찾기로 가기</a></div></div>`; }

  function logo(s = 28) {
    return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 16.5 16 10.5l7 6V23H9z" fill="currentColor"/><path d="M14 23v-3.5h4V23" fill="var(--paper)"/></svg>`;
  }

  /* ---------- 라우터 ---------- */
  const TABS = [['home', '찾기', 'map'], ['check', '안심진단', 'shield'], ['contract', '직거래', 'doc'], ['vault', '사진금고', 'camera'], ['my', '내 정보', 'user']];
  function parse() { const h = location.hash.replace(/^#\/?/, '') || 'home'; const [page, arg] = h.split('/'); return { page, arg }; }
  function nav(active) {
    const a = acc();
    $('#tabbar').innerHTML = TABS.map(([k, t, i]) => `<a href="#/${k}" class="${active === k ? 'on' : ''}" ${active === k ? 'aria-current="page"' : ''}>${ic(i, 22)}<span>${t}</span></a>`).join('');
    $('#rail').innerHTML = `<a class="rail-brand" href="#/home">${logo(30)}<span>보금</span></a>
      <nav aria-label="주요 메뉴">${TABS.map(([k, t, i]) => `<a href="#/${k}" class="${active === k ? 'on' : ''}" ${active === k ? 'aria-current="page"' : ''}>${ic(i, 20)}<span>${t}</span></a>`).join('')}</nav>
      <div class="rail-foot">${a.user ? `<a class="rail-user" href="#/my"><span class="avatar on sm">${esc(a.user.username.slice(0, 1).toUpperCase())}</span><span>${esc(a.user.username)}<small>${a.status === 'syncing' ? '저장 중…' : '로그인됨'}</small></span></a>` : `<a class="btn line block sm" href="#/login">로그인 · 회원가입</a>`}
        <p>모든 매물·등기는 데모 데이터예요.</p></div>`;
  }
  function render(keepScroll) {
    const { page, arg } = parse();
    const view = $('#view');
    const st = window.scrollY;
    const map = { home: viewHome, listing: viewListing, check: viewCheck, contract: viewContract, vault: viewVault, report: viewReport, my: viewMy, login: viewLogin };
    view.innerHTML = (map[page] || viewNotFound)(arg);
    if (!keepScroll) window.scrollTo(0, 0); else window.scrollTo(0, st);
    $('#app').classList.toggle('no-tabs', page === 'listing' || page === 'report');
    nav(page === 'listing' ? 'home' : page === 'report' ? 'vault' : page === 'login' ? 'my' : page);
    document.body.dataset.page = page;
    const titles = { home: '찾기', listing: '매물 상세', check: '안심진단', contract: '직거래', vault: '사진금고', report: '소명 리포트', my: '내 정보', login: '로그인' };
    document.title = (titles[page] ? titles[page] + ' · ' : '') + '보금';
    after(page);
  }
  function after(page) {
    if (page === 'home') { refreshHomeList(); initMap(); }
    if (page === 'contract') initSig();
    if (page === 'report') {
      const hs = allItems().flatMap((it) => ['in', 'out'].map((ph) => state.vault[ph][it.id] && state.vault[ph][it.id].hash).filter(Boolean));
      E.merkleRoot(hs).then((r) => { const el = $('#root-hash'); if (el) el.textContent = r || '-'; });
    }
  }

  /* ---------- 서명 패드 ---------- */
  function initSig() {
    const cv = $('#sig'); if (!cv) return;
    const ctx = cv.getContext('2d');
    ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#16262E';
    let drawing = false;
    const pt = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * cv.width, ((e.clientY - r.top) / r.height) * cv.height]; };
    cv.addEventListener('pointerdown', (e) => { drawing = true; cv.setPointerCapture(e.pointerId); const [x, y] = pt(e); ctx.beginPath(); ctx.moveTo(x, y); cv.dataset.signed = '1'; });
    cv.addEventListener('pointermove', (e) => { if (!drawing) return; const [x, y] = pt(e); ctx.lineTo(x, y); ctx.stroke(); });
    const stop = () => { drawing = false; };
    cv.addEventListener('pointerup', stop); cv.addEventListener('pointercancel', stop);
  }

  /* ---------- 사진 처리 ---------- */
  function loadImg(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
  async function processFile(file) {
    const buf = await file.arrayBuffer();
    const hash = await E.sha256(buf);
    const url = URL.createObjectURL(file);
    try {
      const im = await loadImg(url);
      const sc = Math.min(1, 520 / Math.max(im.width, im.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(im.width * sc); cv.height = Math.round(im.height * sc);
      cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
      return { img: cv.toDataURL('image/jpeg', 0.7), hash, ts: new Date().toISOString(), size: file.size };
    } finally { URL.revokeObjectURL(url); }
  }
  async function samplePhoto(it, phase, i) {
    const cv = document.createElement('canvas'); cv.width = 480; cv.height = 360;
    const g = cv.getContext('2d');
    const hue = (i * 37 + (phase === 'out' ? 8 : 0)) % 360;
    const grd = g.createLinearGradient(0, 0, 480, 360);
    grd.addColorStop(0, `hsl(${hue},14%,${phase === 'out' ? 78 : 86}%)`); grd.addColorStop(1, `hsl(${hue},12%,${phase === 'out' ? 64 : 72}%)`);
    g.fillStyle = grd; g.fillRect(0, 0, 480, 360);
    g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, 250, 480, 110);
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 6; g.strokeRect(150, 60, 180, 140);
    if (phase === 'out' && i % 3 === 0) { g.fillStyle = 'rgba(120,90,40,.28)'; g.beginPath(); g.ellipse(300, 150, 60, 34, 0.4, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(22,38,46,.8)'; g.textAlign = 'center'; g.font = '600 26px "IBM Plex Sans KR", sans-serif'; g.fillText(`${it.zone} · ${it.name}`, 240, 44);
    g.font = '16px "IBM Plex Sans KR", sans-serif'; g.fillText(phase === 'in' ? '입주 기록 (샘플)' : '퇴거 기록 (샘플)', 240, 70);
    const img = cv.toDataURL('image/jpeg', 0.7);
    return { img, hash: await E.sha256(img), ts: new Date(Date.now() - (12 - i) * 1000).toISOString(), size: img.length };
  }
  function saveVault() { if (!store.set('vault', state.vault)) toast('저장 공간이 부족해 이 기기에 저장하지 못했어요', 'warn'); }

  /* ---------- 액션 ---------- */
  const actions = {
    back() { if (history.length > 1) history.back(); else location.hash = '#/home'; },
    closeModal,
    filter(el) { const k = el.dataset.key, v = el.dataset.val; state.filters[k] = state.filters[k] === v && v !== 'all' ? 'all' : v; render(true); },
    safeOnly() { state.filters.safeOnly = !state.filters.safeOnly; render(true); },
    resetFilter() { state.filters = { deal: 'all', room: 'all', safeOnly: false, q: '' }; render(true); },
    pick(el) {
      if (state.mapDragged && Date.now() - state.mapDragged < 250) return;
      const id = el.dataset.arg;
      if (state.selected === id) { location.hash = '#/listing/' + id; return; }
      state.selected = id; refreshHomeList();
      const c = $('#card-' + id); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
    fav(el, e) {
      e.stopPropagation();
      const id = el.dataset.arg, i = state.favs.indexOf(id);
      if (i >= 0) state.favs.splice(i, 1); else state.favs.push(id);
      store.set('favs', state.favs); el.classList.toggle('on', i < 0); el.setAttribute('aria-pressed', i < 0);
      toast(i >= 0 ? '찜을 해제했어요' : '찜한 집에 담았어요');
    },
    unlock(el) {
      const id = el.dataset.arg;
      if (!state.freeUsed) { state.freeUsed = true; store.set('freeUsed', true); state.unlocked.push(id); store.set('unlocked', state.unlocked); render(true); toast('정밀 리포트를 열었어요', 'ok'); return; }
      modal(`<h3>정밀 권리분석 리포트</h3><div class="bill"><div><span>HUG 126% + 등기부 정밀 리포트</span><b>4,900원</b></div></div>
        <p class="fine">데모 결제예요. 실제로 결제되지 않습니다.</p><button class="btn primary block" data-act="payUnlock" data-arg="${id}">4,900원 결제 (데모)</button>`);
    },
    payUnlock(el) { state.unlocked.push(el.dataset.arg); store.set('unlocked', state.unlocked); closeModal(); render(true); toast('결제 완료 (데모)', 'ok'); },
    copy(el) { copyText(BG.CLAUSES.find((x) => x.id === el.dataset.arg).text); },
    copyAll(el) { const l = L(el.dataset.arg); copyText(BG.CLAUSES.filter((c) => c.id !== 'c6' || l.type === '다가구').map((c, i) => `${i + 1}. ${c.text}`).join('\n')); },
    copyText(el) { copyText(el.dataset.arg); },
    toggleCare() { state.care = !state.care; store.set('care', state.care); render(true); toast(state.care ? '안심케어 구독을 시작했어요 (데모)' : '안심케어 구독을 해지했어요'); },
    startContract(el) {
      const id = el.dataset.arg;
      if (state.ct && state.ct.listingId !== id && state.ct.step > 0) {
        modal(`<h3>진행 중인 계약이 있어요</h3><p class="muted">${esc(L(state.ct.listingId).name)} 계약을 ${CT_STEPS[state.ct.step]} 단계까지 진행했어요. 새로 시작하면 기존 진행 내용이 사라져요.</p>
          <div class="btn-row wide"><button class="btn line" data-act="goContract">이어서 하기</button><button class="btn primary" data-act="forceContract" data-arg="${id}">새로 시작</button></div>`);
        return;
      }
      if (!state.ct || state.ct.listingId !== id) { state.ct = newContract(L(id)); saveCt(); }
      location.hash = '#/contract/' + id;
    },
    goContract() { closeModal(); location.hash = '#/contract'; },
    forceContract(el) { closeModal(); state.ct = newContract(L(el.dataset.arg)); saveCt(); location.hash = '#/contract/' + el.dataset.arg; },
    resetContract() { const id = state.ct && state.ct.listingId; state.ct = id ? newContract(L(id)) : null; saveCt(); render(); },
    auth(el) {
      const who = el.dataset.arg;
      el.disabled = true; el.innerHTML = '<span class="spin"></span>';
      setTimeout(() => { if (who === 'tenant') state.ct.tenantOk = true; else state.ct.landlordOk = true; saveCt(); render(true); toast(who === 'tenant' ? '본인인증 완료 (데모)' : '임대인이 인증을 마쳤어요 (데모)', 'ok'); }, 1000);
    },
    riskAck(el) { state.ct.riskAck = el.checked; saveCt(); render(true); },
    ctNext() {
      const ct = state.ct;
      if (ct.step === 1) {
        const f = ct.form;
        if (!f.tenant.trim() || !(+f.deposit > 0) || !(+f.down > 0) || +f.down > +f.deposit) { toast('계약 조건을 확인해 주세요 (계약금은 보증금 이하)', 'warn'); return; }
      }
      if (ct.step === 4) return;
      ct.step++; saveCt(); render();
    },
    ctPrev() { state.ct.step = Math.max(0, state.ct.step - 1); saveCt(); render(); },
    escrowAll(el) { state.ct.form.escrowAll = el.dataset.arg === '1'; saveCt(); render(true); },
    daepil(el) { state.ct.form.daepil = el.checked; saveCt(); render(true); },
    clause(el) { const ct = state.ct, id = el.dataset.arg; ct.clauses = el.checked ? ct.clauses.concat(id) : ct.clauses.filter((x) => x !== id); saveCt(); render(true); },
    clearSig() { const cv = $('#sig'); cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); delete cv.dataset.signed; },
    async seal() {
      const cv = $('#sig');
      if (!cv.dataset.signed) { toast('서명을 입력해 주세요', 'warn'); return; }
      if (!$('#agree').checked) { toast('전자서명 효력에 동의해 주세요', 'warn'); return; }
      const ct = state.ct;
      ct.sig = cv.toDataURL('image/png');
      ct.sealedAt = new Date().toISOString();
      ct.hash = await E.sha256(docPayload(ct));
      ct.tsa = 'TST-' + (await E.sha256(ct.hash + ct.sealedAt)).slice(0, 32).toUpperCase();
      saveCt(); render(); toast('계약서를 봉인했어요', 'ok');
    },
    async verifyHash() {
      const h = await E.sha256(docPayload(state.ct));
      toast(h === state.ct.hash ? '무결성 확인 · 봉인 뒤 바뀐 내용 없음' : '경고: 문서 해시가 달라요', h === state.ct.hash ? 'ok' : 'warn');
    },
    escNext() {
      const ct = state.ct, es = ct.escrow, stages = escrowStages(ct);
      if (es.stage >= stages.length - 1) return;
      es.stage++;
      const base = new Date(ct.form.balanceDate + 'T09:00:00');
      const t = new Date(es.stage <= 1 ? Date.now() : base.getTime() + (es.stage - 2) * 6 * 3600000);
      const l = L(ct.listingId);
      if (es.stage === 1) es.log.push({ t: t.toISOString(), msg: `등기 감시 시작 · 갑구 ${l.gap.length}건 / 을구 ${l.eul.length}건 기준선 저장` });
      for (let k = 0; k < 2; k++) es.log.push({ t: new Date(t.getTime() + k * 3600000).toISOString(), msg: '등기부 변동 없음' });
      if (es.stage === stages.length - 1) es.log.push({ t: new Date(t.getTime() + 3 * 3600000).toISOString(), msg: '대항력 발생 확인 · 정산 지시 완료' });
      saveCt(); render(true);
    },
    escAlert() {
      const es = state.ct.escrow; es.alert = true;
      const last = es.log.length ? new Date(es.log[es.log.length - 1].t).getTime() : Date.now();
      es.alertAt = new Date(last + 30 * 60000).toISOString();
      es.log.push({ t: es.alertAt, msg: '을구 근저당권설정 접수 감지 → 알림 발송 · 정산 보류', bad: true });
      saveCt(); render(true);
    },
    clearAlert() { const es = state.ct.escrow; es.alert = false; es.log = es.log.filter((g) => !g.bad); saveCt(); render(true); },
    refund() { modal(`<h3>예치금 반환 요청</h3><p class="muted">특약 1(잔금 다음 날까지 담보권 설정 금지) 위반을 근거로 계약 해제 통지와 예치금 전액 반환을 요청합니다. 데모라 실제로 발송되지 않아요.</p><button class="btn primary block" data-act="closeModal">확인</button>`); },
    vaultTab(el) { state.vaultTab = el.dataset.arg; render(); },
    goVault() { state.vaultTab = 'in'; location.hash = '#/vault'; },
    delPhoto(el) { delete state.vault[el.dataset.phase][el.dataset.arg]; saveVault(); render(true); },
    async sampleFill() {
      const items = allItems(), v = state.vault;
      const phase = state.vaultTab === 'out' ? 'out' : 'in';
      for (let i = 0; i < items.length; i++) if (!v[phase][items[i].id]) v[phase][items[i].id] = await samplePhoto(items[i], phase, i);
      if (phase === 'out') { v.judg.living_wall = v.judg.living_wall || 'wear'; v.judg.kitchen_sink = v.judg.kitchen_sink || 'tenant'; v.judg.room_floor = v.judg.room_floor || 'wear'; }
      saveVault(); render(true); toast(phase === 'in' ? '입주 샘플 12장을 봉인했어요' : '퇴거 샘플 12장을 등록했어요', 'ok');
    },
    print() { window.print(); },
    resetAll() {
      const cloud = acc().user;
      modal(`<h3>데모 데이터 초기화</h3><p class="muted">이 기기의 계약 진행, 사진 금고, 찜, 구독 상태를 모두 지워요.${cloud ? ' 로그인한 계정에 저장된 데이터도 함께 지워집니다.' : ''}</p><div class="btn-row wide"><button class="btn line" data-act="closeModal">취소</button><button class="btn danger" data-act="doReset">초기화</button></div>`);
    },
    async doReset() {
      try { if (acc().wipe) await acc().wipe(); } catch (e) { toast(e.message, 'warn'); }
      store.clear(); reloadState();
      Object.assign(state, { vaultTab: 'in', selected: null });
      closeModal(); render(); toast('초기화했어요');
    },
    authMode(el) { state.auth.mode = el.dataset.arg; state.auth.error = ''; render(); },
    async logout() { await acc().logout(); store.clear(); reloadState(); render(); toast('로그아웃했어요'); },
    syncRetry() { acc().retry(); },
    reviewSample(el) { state.review.text = el.dataset.q; const t = $('#review-text'); if (t) t.value = el.dataset.q; },
    async review(el) {
      const t = $('#review-text'); state.review.text = t ? t.value : '';
      if (BG.ai) BG.ai.review(el.dataset.arg ? L(el.dataset.arg) : null);
    },
  };
  function docPayload(ct) { return JSON.stringify({ l: ct.listingId, f: ct.form, c: ct.clauses, s: ct.sig, t: ct.sealedAt }); }
  function copyText(t) {
    const ok = () => toast('복사했어요', 'ok');
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(ok, () => fallbackCopy(t, ok));
    else fallbackCopy(t, ok);
  }
  function fallbackCopy(t, ok) {
    const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); ok(); } catch (e) { toast('복사하지 못했어요', 'warn'); }
    ta.remove();
  }

  async function submitAuth(form) {
    const s = state.auth, a = acc();
    const u = form.username.value.trim().toLowerCase(), p = form.password.value;
    const err = (m) => { s.error = m; $('#auth-err').textContent = m; };
    if (!/^[a-z0-9_]{4,20}$/.test(u)) return err('아이디는 영문 소문자·숫자·밑줄(_)로 4~20자여야 해요');
    if (p.length < 8) return err('비밀번호는 8자 이상이어야 해요');
    if (s.mode === 'signup' && p !== form.password2.value) return err('비밀번호 확인이 일치하지 않아요');
    s.busy = true; s.error = '';
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.innerHTML = '<span class="spin"></span>잠시만요';
    try {
      if (s.mode === 'signup') await a.signup(u, p); else await a.login(u, p);
      s.busy = false;
      toast(s.mode === 'signup' ? `${u}님, 가입을 환영해요` : `${u}님, 다시 오셨네요`, 'ok');
      location.hash = '#/my'; render();
    } catch (e) {
      s.busy = false; btn.disabled = false; btn.textContent = s.mode === 'signup' ? '가입하고 시작하기' : '로그인';
      err(e.message === 'Failed to fetch' ? '서버에 연결하지 못했어요. 네트워크를 확인해 주세요' : e.message);
    }
  }

  /* ---------- 입력 바인딩 ---------- */
  const inputs = {
    hugDeposit(el) {
      const id = el.dataset.arg, v = +el.value; state.hugDeposit[id] = v;
      $('#hug-block').innerHTML = hugBlock(L(id), v); $('#dep-val').textContent = E.fmtMan(v);
    },
    manual(el) {
      const k = el.dataset.key; state.manual[k] = k === 'type' ? el.value : +el.value;
      if (k === 'type') render(true); else $('#manual-result').innerHTML = manualResult();
    },
    ctForm(el, ev) {
      const k = el.dataset.key; const f = state.ct.form;
      f[k] = el.type === 'number' || k === 'months' ? +el.value : el.value;
      if (k === 'balanceDate') f.start = el.value;
      if (k === 'deposit' && ev.type === 'change') f.down = Math.round(f.deposit * 0.1);
      saveCt();
      if (ev.type === 'change') render(true);
    },
    judg(el) { state.vault.judg[el.dataset.key] = el.value; saveVault(); },
    cost(el, ev) { state.vault.cost[el.dataset.key] = +el.value; saveVault(); if (ev.type === 'change') render(true); },
    vault(el, ev) { state.vault[el.dataset.key] = el.type === 'number' ? +el.value : el.value; saveVault(); if (ev.type === 'change') render(true); },
    fee(el) { state.fee[el.dataset.key] = +el.value; $('#fee-out').innerHTML = feeOut(E.brokerFee(+state.fee.deposit || 0, +state.fee.rent || 0)); },
  };

  /* ---------- 이벤트 위임 ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (a && !(a.tagName === 'INPUT' && (a.type === 'checkbox' || a.type === 'radio'))) {
      if (a.disabled) return;
      const fn = actions[a.dataset.act];
      if (fn) { e.preventDefault(); fn(a, e); }
      return;
    }
    const g = e.target.closest('[data-go]');
    if (g && !g.disabled && !e.target.closest('a')) location.hash = g.dataset.go;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    const g = e.target.closest && e.target.closest('[data-go]');
    if (g && e.target === g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); location.hash = g.dataset.go; }
  });
  document.addEventListener('submit', (e) => { if (e.target.id === 'auth-form') { e.preventDefault(); submitAuth(e.target); } });
  document.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.matches('input[type=checkbox][data-act], input[type=radio][data-act]')) { const fn = actions[el.dataset.act]; if (fn) fn(el, e); return; }
    if (el.matches('input[type=file][data-slot]')) {
      const file = el.files && el.files[0]; if (!file) return;
      if (!/^image\//.test(file.type)) { toast('이미지 파일만 등록할 수 있어요', 'warn'); return; }
      try {
        const rec = await processFile(file);
        state.vault[el.dataset.phase][el.dataset.slot] = rec; saveVault(); render(true);
        toast('봉인 완료 · ' + rec.hash.slice(0, 10) + '…', 'ok');
      } catch (err) { toast('사진을 처리하지 못했어요', 'warn'); }
      return;
    }
    if (el.dataset.input && inputs[el.dataset.input]) inputs[el.dataset.input](el, e);
  });
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.id === 'q') { state.filters.q = el.value; refreshHomeList(); return; }
    if (el.id === 'review-text') { state.review.text = el.value; return; }
    if (el.dataset.input && inputs[el.dataset.input] && el.tagName !== 'SELECT') inputs[el.dataset.input](el, e);
  });

  window.addEventListener('hashchange', () => { closeModal(); render(); });
  window.addEventListener('resize', () => { if (parse().page === 'home') initMap(); });

  // account.js · ai.js가 쓰는 앱 내부 접근점
  let lastUser = '';
  BG.app = {
    state, store, render, parse, toast, modal, closeModal, actions, diag, L, LV, esc, ic, reloadState,
    onAccount() {
      // 로그인 상태가 바뀌면 전체를 다시 그리고, 저장 상태만 바뀌면 내비·계정 카드만 갱신한다
      const who = acc().user ? acc().user.username : '';
      const { page } = parse();
      if (who !== lastUser) { lastUser = who; render(true); if (BG.ai) BG.ai.reload(); return; }
      if (page === 'my') render(true); else nav(page === 'listing' ? 'home' : page === 'report' ? 'vault' : page === 'login' ? 'my' : page);
    },
  };
  render();
  if (BG.account) BG.account.init();

  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
