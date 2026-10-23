/* 보금 — AI 상담 패널 + AI 문구 검토 (서버 /api/ai, 로그인 회원 전용)
   서버가 ready를 돌려줄 때만 상담 버튼을 그린다. */
(function () {
  const A = BG.app;
  if (!A) return;
  const E = BG.eng;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = A.esc;
  const IC = {
    chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    send: '<path d="M4 12 20 4l-6 16-3-7z"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.5-5.8"/><path d="M4 4v4h4"/>',
  };
  const ic = (n, s = 20) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;
  const SUGGEST = ['HUG 126% 판정이 뭐예요?', '계약 전에 등기부에서 뭘 봐야 해요?', '전입신고는 언제 해야 안전해요?'];

  const st = { ready: false, open: false, busy: false, msgs: A.store.get('chat', []) };
  const save = () => A.store.set('chat', st.msgs.slice(-30));
  const acc = () => BG.account || {};

  /* ---------- 지금 보는 화면 → AI에 넘길 맥락 ---------- */
  function listingOf() {
    const { page, arg } = A.parse();
    return ['listing', 'check', 'contract'].includes(page) && arg ? A.L(arg) : null;
  }
  function listingCtx(l) {
    const d = A.diag(l), h = d.hug, est = d.est;
    return {
      id: l.id, name: l.name, addr: l.addr, type: l.type, deal: l.deal,
      price: l.deal === '월세' ? `보증금 ${E.fmtMan(l.deposit)} / 월 ${l.rent}만` : `전세 ${E.fmtMan(l.deposit)}`,
      verdict: `${A.LV[d.level].label} (안심점수 ${d.score})`,
      hug: `${h.pass ? '가입 가능' : '가입 불가'} · 보증금+선순위 ${E.fmtMan(h.total)} / 한도 ${E.fmtMan(h.limit)} · 보증 가능 최대 보증금 ${E.fmtMan(h.maxSafeDeposit)}`,
      aiPrice: `적정 매매 ${E.fmtMan(est.saleLow)}~${E.fmtMan(est.saleHigh)}, 적정 전세 ${E.fmtMan(est.jeonse)}`,
      owner: `${l.owner} (${l.ownerType}, ${l.ownerSince}부터 소유)`,
      risks: d.items.filter((it) => it.level > 0).map((it) => `[${A.LV[it.level].label}] ${it.title}: ${it.detail}`),
    };
  }
  function context() {
    const { page } = A.parse();
    const ctx = { page, listings: BG.LISTINGS.map((l) => ({ id: l.id, name: l.name, level: A.LV[A.diag(l).level].label })) };
    const l = listingOf();
    if (l) ctx.listing = listingCtx(l);
    return ctx;
  }

  /* ---------- 답변 렌더 (이스케이프 후 굵게 · 목록 · 앱 내부 링크만) ---------- */
  function md(text) {
    if (!text) return '';
    const inline = (s) => esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\((#\/[\w\-/]*)\)/g, '<a href="$2">$1</a>');
    const out = []; let list = null;
    for (const raw of text.split('\n')) {
      const line = raw.trimEnd();
      const li = /^\s*(?:[-*•]|\d+\.)\s+(.*)$/.exec(line);
      if (li) { if (!list) { list = []; out.push(list); } list.push(inline(li[1])); continue; }
      list = null;
      if (line.trim()) out.push(inline(line.replace(/^#+\s*/, '')));
    }
    return out.map((b) => (Array.isArray(b) ? `<ul>${b.map((x) => `<li>${x}</li>`).join('')}</ul>` : `<p>${b}</p>`)).join('');
  }

  /* ---------- 공통 스트리밍 호출 ---------- */
  async function stream(payload, onText) {
    const token = acc().token;
    if (!token) throw new Error('로그인이 필요해요');
    const r = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(payload),
    });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'AI 응답을 받지 못했어요 (' + r.status + ')'); }
    const reader = r.body.getReader(), dec = new TextDecoder();
    let text = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += dec.decode(value, { stream: true });
      onText(text);
    }
    if (!text.trim()) throw new Error('빈 답변이 왔어요. 다시 시도해 주세요');
    return text;
  }
  const netMsg = (e) => (e.message === 'Failed to fetch' ? 'AI 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요' : e.message);

  /* ---------- 문구 검토 ---------- */
  async function review(l) {
    const r = A.state.review;
    if (r.busy) return;
    if ((r.text || '').trim().length < 10) { A.toast('검토할 문구를 10자 이상 넣어 주세요', 'warn'); return; }
    r.busy = true; r.out = ''; r.error = '';
    A.render(true);
    const out = () => $('#review-out');
    try {
      await stream({ mode: 'review', text: r.text, context: l ? { listing: listingCtx(l) } : {} }, (t) => {
        r.out = t; const el = out(); if (el) { el.classList.remove('hidden'); el.innerHTML = md(t); }
      });
    } catch (e) { r.error = netMsg(e); }
    r.busy = false;
    A.render(true);
    const el = out(); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------- 상담 패널 ---------- */
  const bubble = (m) => `<div class="chat-msg ${m.role}${m.error ? ' err' : ''}">${m.role === 'user' ? `<p>${esc(m.content)}</p>` : m.content ? md(m.content) : '<span class="chat-dots" aria-label="답변 작성 중"><i></i><i></i><i></i></span>'}</div>`;
  function body() {
    if (!acc().user) return `<div class="chat-empty"><b>로그인하면 AI 상담을 쓸 수 있어요</b><p>앱 사용법, 전세사기 예방, 지금 보는 집의 위험 요소를 물어보세요.</p><a class="btn primary sm" href="#/login" data-act="chatClose">로그인</a></div>`;
    if (!st.msgs.length) {
      const sug = listingOf() ? ['이 집, 계약해도 괜찮을까요?'].concat(SUGGEST.slice(0, 2)) : SUGGEST;
      return `<div class="chat-empty"><b>무엇이든 물어보세요</b><p>${listingOf() ? '지금 보는 집의 진단 결과를 함께 참고해서 답해요.' : '보금 사용법과 임대차 상식을 알려드려요.'}</p><div class="chat-sug">${sug.map((q) => `<button class="chip" data-act="chatAsk" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div></div>`;
    }
    return st.msgs.map(bubble).join('');
  }
  function draw() {
    let root = $('#chat-root');
    if (!st.ready) return;
    if (!root) { root = document.createElement('div'); root.id = 'chat-root'; document.body.appendChild(root); }
    const ok = !!acc().user;
    root.innerHTML = `
      <button class="chat-fab ${st.open ? 'hide' : ''}" data-act="chatToggle" aria-label="AI 상담 열기">${ic('chat', 22)}<span>AI 상담</span></button>
      <section class="chat-panel ${st.open ? 'open' : ''}" role="dialog" aria-label="AI 상담" ${st.open ? '' : 'hidden'}>
        <header class="chat-head"><div><b>AI 상담</b><small>보금 안내서 · 지금 보는 화면 참고</small></div>
          ${ok && st.msgs.length ? `<button class="icon-btn sm" data-act="chatReset" aria-label="새 대화">${ic('reset', 18)}</button>` : ''}
          <button class="icon-btn sm" data-act="chatToggle" aria-label="닫기">${ic('x', 20)}</button></header>
        <div class="chat-body" id="chat-body" aria-live="polite">${body()}</div>
        ${ok ? `<div class="chat-input"><textarea id="chat-q" rows="1" maxlength="2000" placeholder="질문을 입력하세요" aria-label="질문" ${st.busy ? 'disabled' : ''}></textarea>
          <button class="chat-send" data-act="chatSend" aria-label="보내기" ${st.busy ? 'disabled' : ''}>${ic('send', 18)}</button></div>` : ''}
        <p class="chat-note">AI 답변은 틀릴 수 있어요. 법률·금융 판단은 전문가에게 확인하세요.</p>
      </section>`;
    const b = $('#chat-body'); if (b) b.scrollTop = b.scrollHeight;
  }
  function focusInput() { setTimeout(() => { const q = $('#chat-q'); if (q && window.matchMedia('(min-width: 600px)').matches) q.focus(); }, 30); }

  async function ask(text) {
    text = (text || '').trim();
    if (!text || st.busy) return;
    const history = st.msgs.filter((m) => !m.error).map(({ role, content }) => ({ role, content }));
    st.msgs.push({ role: 'user', content: text });
    const bot = { role: 'assistant', content: '' };
    st.msgs.push(bot);
    st.busy = true; draw();
    try {
      await stream({ mode: 'chat', messages: history.concat({ role: 'user', content: text }), context: context() }, (t) => {
        bot.content = t;
        const el = $('#chat-body .chat-msg:last-child'); if (el) { el.innerHTML = md(t); const box = $('#chat-body'); box.scrollTop = box.scrollHeight; }
      });
    } catch (e) { bot.content = netMsg(e); bot.error = true; }
    st.busy = false; save(); draw(); focusInput();
  }

  Object.assign(A.actions, {
    chatToggle() { st.open = !st.open; draw(); if (st.open) focusInput(); },
    chatClose() { st.open = false; draw(); location.hash = '#/login'; },
    chatReset() { st.msgs = []; save(); draw(); focusInput(); },
    chatAsk(el) { ask(el.dataset.q); },
    chatSend() { const q = $('#chat-q'); if (q) ask(q.value); },
  });

  // Enter로 보내기 (Shift+Enter 줄바꿈, 한글 조합 중에는 무시)
  document.addEventListener('keydown', (e) => {
    if (e.target.id === 'chat-q' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(e.target.value); }
    if (e.key === 'Escape' && st.open) { st.open = false; draw(); }
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'chat-q') { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }
  });
  // 모바일에서는 화면을 옮기면 전체 화면 패널을 닫는다
  window.addEventListener('hashchange', () => {
    if (st.open && !window.matchMedia('(min-width: 600px)').matches) { st.open = false; draw(); }
  });

  BG.ai = {
    md, review, draw,
    reload() { st.msgs = A.store.get('chat', []); draw(); },
  };

  fetch('/api/ai').then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && j.ready) { st.ready = true; draw(); } }).catch(() => {});
})();
