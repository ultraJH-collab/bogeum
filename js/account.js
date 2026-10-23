/* 보금 — 아이디/비밀번호 계정 + 클라우드 동기화 (Supabase RPC, 이메일 인증 없음)
   토큰은 localStorage(bg_session)에 보관하고, 모든 호출은 public.bg_* 함수로만 한다. */
window.BG = window.BG || {};

(function () {
  const C = BG.CONFIG;
  const SYNC_KEYS = ['favs', 'unlocked', 'freeUsed', 'care', 'ct', 'vault', 'chat'];
  const ERR = {
    BAD_USERNAME: '아이디는 영문 소문자·숫자·밑줄(_)로 4~20자여야 해요',
    BAD_PASSWORD: '비밀번호는 8자 이상이어야 해요',
    USERNAME_TAKEN: '이미 쓰고 있는 아이디예요',
    BAD_CREDENTIALS: '아이디 또는 비밀번호가 맞지 않아요',
    LOCKED: '비밀번호를 5번 틀려 10분 동안 로그인이 잠겼어요',
    UNAUTHORIZED: '로그인이 만료됐어요. 다시 로그인해 주세요',
    TOO_LARGE: '저장할 데이터가 너무 커요 (사진 수를 줄여 주세요)',
  };

  async function rpc(fn, args) {
    const r = await fetch(`${C.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: C.SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    const text = await r.text();
    const data = text ? JSON.parse(text) : null;
    if (!r.ok) { const code = (data && data.message) || 'HTTP_' + r.status; const e = new Error(ERR[code] || '서버 요청에 실패했어요 (' + code + ')'); e.code = code; throw e; }
    return data;
  }

  const ls = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* noop */ } },
  };

  const acc = {
    user: null,           // { username }
    token: null,
    status: 'off',        // off | syncing | ok | error
    error: '',
    ready: false,
  };
  const timers = {};
  const pending = {};

  function app() { return BG.app; }
  function setStatus(s, err) { acc.status = s; acc.error = err || ''; if (app()) app().onAccount(); }

  /* 로컬 변경 → 0.8초 디바운스 후 서버 저장 */
  acc.push = function (key, value) {
    if (!acc.token || !SYNC_KEYS.includes(key)) return;
    pending[key] = value;
    clearTimeout(timers[key]);
    timers[key] = setTimeout(async () => {
      const v = pending[key]; delete pending[key];
      setStatus('syncing');
      try { await rpc('bg_state_put', { p_token: acc.token, p_key: key, p_value: v === undefined ? null : v }); setStatus('ok'); }
      catch (e) { if (e.code === 'UNAUTHORIZED') return expire(); setStatus('error', e.message); }
    }, 800);
  };

  /* 로그인 직후: 서버 값 우선 병합, 서버에 없는 키는 로컬 값을 올린다 */
  async function pull() {
    setStatus('syncing');
    const server = await rpc('bg_state_get', { p_token: acc.token });
    const A = app();
    for (const k of SYNC_KEYS) {
      if (server[k] !== undefined && server[k] !== null) A.store.put(k, server[k]);
      else { const local = A.store.get(k, undefined); if (local !== undefined && local !== null) await rpc('bg_state_put', { p_token: acc.token, p_key: k, p_value: local }); }
    }
    A.reloadState();
    setStatus('ok');
  }

  async function begin(res) {
    acc.token = res.token; acc.user = { username: res.username };
    ls.set('bg_session', { token: res.token, username: res.username });
    try { await pull(); } catch (e) { setStatus('error', e.message); }
  }
  function expire() {
    acc.token = null; acc.user = null; ls.set('bg_session', null); setStatus('off');
    if (app()) app().toast('로그인이 만료됐어요', 'warn');
  }

  acc.signup = async (username, password) => begin(await rpc('bg_signup', { p_username: username, p_password: password }));
  acc.login = async (username, password) => begin(await rpc('bg_login', { p_username: username, p_password: password }));
  acc.logout = async function () {
    const t = acc.token;
    acc.token = null; acc.user = null; ls.set('bg_session', null);
    try { if (t) await rpc('bg_logout', { p_token: t }); } catch (e) { /* 토큰은 이미 지움 */ }
    setStatus('off');
  };
  acc.wipe = async function () { if (acc.token) await rpc('bg_state_clear', { p_token: acc.token }); };
  acc.retry = () => pull().catch((e) => setStatus('error', e.message));

  acc.init = async function () {
    const s = ls.get('bg_session');
    if (s && s.token) {
      acc.token = s.token; acc.user = { username: s.username };
      try {
        const me = await rpc('bg_me', { p_token: s.token });
        if (!me) { expire(); } else { acc.user = { username: me.username, since: me.since }; await pull(); }
      } catch (e) { setStatus('error', e.message); }
    }
    acc.ready = true;
    if (app()) app().onAccount();
  };

  BG.account = acc;
})();
