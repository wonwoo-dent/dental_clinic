// 3사단 의무대대 치과 — 페이지 동작
// 1) 안내판이 한국 시간으로 지금 진료 중인지 보여 준다  2) 섹션에 맞춰 고정 판의 그림이 바뀐다  3) 섹션이 들어올 때 한 번 드러난다

(() => {
  // ---------- 1. 진료 시간 안내판 ----------
  const HOURS = { open: 9 * 60, lunchStart: 12 * 60, lunchEnd: 13 * 60, close: 17 * 60 }; // 분 단위
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const status = document.getElementById('now-status');
  const next = document.getElementById('now-next');
  const marker = document.getElementById('now-line');
  const markerLabel = document.getElementById('now-label');
  const clock = document.getElementById('now-clock');
  if (!status || !next) return;

  function seoulNow() {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', hour12: false, weekday: 'short', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t)?.value;
    const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const hour = Number(get('hour')) % 24;
    return { day: map[get('weekday')] ?? new Date().getDay(), minutes: hour * 60 + Number(get('minute')) };
  }
  const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const left = (m) => (m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60 ? `${m % 60}분` : ''}`.trim() : `${m}분`);

  function render() {
    const { day, minutes } = seoulNow();
    const weekday = day >= 1 && day <= 5;
    let s, n;
    if (!weekday) {
      s = '오늘은 휴진입니다';
      n = `${day === 6 ? '월요일' : '내일'} 09:00에 다시 엽니다. 응급 치통은 당직 의무병을 통해 연락하세요.`;
    } else if (minutes < HOURS.open) {
      s = '아직 열기 전입니다';
      n = `${left(HOURS.open - minutes)} 뒤인 09:00에 엽니다. 점심시간은 12:00–13:00입니다.`;
    } else if (minutes < HOURS.lunchStart) {
      s = '지금 진료 중입니다';
      n = `점심시간 12:00까지 ${left(HOURS.lunchStart - minutes)} 남았습니다. 오후 진료는 13:00–17:00입니다.`;
    } else if (minutes < HOURS.lunchEnd) {
      s = '점심시간입니다';
      n = `${left(HOURS.lunchEnd - minutes)} 뒤인 13:00에 오후 진료를 시작합니다.`;
    } else if (minutes < HOURS.close) {
      s = '지금 진료 중입니다';
      n = `오늘 진료는 17:00까지, ${left(HOURS.close - minutes)} 남았습니다.`;
    } else {
      s = '오늘 진료가 끝났습니다';
      n = `${day === 5 ? '월요일' : '내일'} 09:00에 다시 엽니다. 응급 치통은 당직 의무병을 통해 연락하세요.`;
    }
    status.textContent = s;
    next.textContent = n;
    if (clock) clock.textContent = `${DAYS[day]}요일 ${hhmm(minutes)}`;

    // 안내판의 '지금' 막대: 08:00(y=250)부터 18:00(y=690)까지 한 시간에 44px
    if (marker) {
      const clamped = Math.min(Math.max(minutes, 8 * 60), 18 * 60);
      const y = 250 + ((clamped - 8 * 60) / 60) * 44;
      marker.setAttribute('transform', `translate(0 ${y - 250})`);
      marker.style.opacity = weekday ? '1' : '0';
      if (markerLabel) markerLabel.textContent = hhmm(minutes);
    }
  }
  render();
  setInterval(() => { if (!document.hidden) render(); }, 30 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
})();

(() => {
  // ---------- 2. 섹션에 따라 고정 판의 그림이 바뀐다 ----------
  const scenes = Array.from(document.querySelectorAll('.panel__scene'));
  const triggers = Array.from(document.querySelectorAll('[data-scene]'));
  if (!scenes.length || !triggers.length || !('IntersectionObserver' in window)) return;
  // 보이지 않는 장면은 display:none 으로 둔다. 바뀔 때만 둘 다 켜서 겹쳐 보이게 한 뒤 끝난 쪽을 끈다.
  const show = (name) => scenes.forEach((s) => {
    const active = s.dataset.sceneName === name;
    clearTimeout(s._hideTimer);
    if (active) {
      if (s.hidden) { s.hidden = false; void s.offsetWidth; }
      s.classList.add('is-active');
    } else if (s.classList.contains('is-active')) {
      s.classList.remove('is-active');
      s._hideTimer = setTimeout(() => { s.hidden = true; }, 400);
    } else {
      s.hidden = true;
    }
  });
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) show(e.target.dataset.scene);
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  triggers.forEach((t) => io.observe(t));
})();

(() => {
  // ---------- 3. 한 번만 드러나기 ----------
  const targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length) return;
  if (!('IntersectionObserver' in window)) { targets.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
  targets.forEach((el) => io.observe(el));
  window.addEventListener('load', () => setTimeout(() => {
    targets.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in'); });
  }, 2500));
})();

(() => {
  // ---------- 4. 의견함: 홈페이지 안에서 적은 글을 구글 폼 응답함으로 보낸다 ----------
  // 새 창을 열지 않으려고 숨긴 iframe 으로 제출한다. 구글이 답을 돌려주지 않으므로 제출이 끝나면 "보냈습니다"로 바꾼다.
  const form = document.getElementById('fb-form');
  if (!form || form.action.includes('FORM_ACTION')) return;
  const field = document.getElementById('fb-text');
  const done = document.getElementById('fb-done');
  const note = document.getElementById('fb-note');
  const sink = form.ownerDocument.querySelector('iframe[name="fb-sink"]');
  let sending = false;
  form.addEventListener('submit', (e) => {
    const text = field.value.trim();
    if (!text) { e.preventDefault(); field.focus(); note.textContent = '내용을 적은 뒤 보내 주세요.'; return; }
    if (sending) { e.preventDefault(); return; }
    sending = true;
    form.classList.add('is-sending');
    note.textContent = '보내는 중…';
    const finish = () => {
      sending = false;
      form.classList.remove('is-sending');
      field.value = '';
      note.textContent = '보내면 치과 의견함에 바로 쌓입니다.';
      done.hidden = false;
      done.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    if (sink) { sink.addEventListener('load', finish, { once: true }); setTimeout(() => { if (sending) finish(); }, 4000); }
    else setTimeout(finish, 800);
  });
})();
