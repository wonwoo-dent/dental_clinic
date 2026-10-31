// 3사단 의무대대 치과 — 페이지 동작
// 1) 홈의 '오늘 진료' 칸: 한국 시간으로 지금 진료 중인지 보여 준다  2) 의견함을 구글 폼으로 보낸다

(() => {
  // ---------- 1. 오늘 진료 ----------
  const HOURS = { open: 9 * 60, lunchStart: 12 * 60, lunchEnd: 13 * 60, close: 16 * 60 }; // 분 단위
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const status = document.getElementById('now-status');
  const next = document.getElementById('now-next');
  const clock = document.getElementById('now-clock');
  const badge = document.getElementById('now-badge');
  if (!status || !next) return;

  function seoulNow() {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', hour12: false, weekday: 'short', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t)?.value;
    const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { day: map[get('weekday')] ?? new Date().getDay(), month: Number(get('month')), date: Number(get('day')), minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')) };
  }
  const left = (m) => (m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60 ? `${m % 60}분` : ''}`.trim() : `${m}분`);

  function render() {
    const { day, month, date, minutes } = seoulNow();
    const weekday = day >= 1 && day <= 5;
    const tomorrow = (d) => (d === 5 || d === 6 ? '월요일' : '내일');
    let s, n, b = 'CLOSED';
    if (!weekday) {
      s = '휴진'; n = `${tomorrow(day)} 09:00에 다시 엽니다. 예약은 그때 군 전화로 내선 803-7112.`;
    } else if (minutes < HOURS.open) {
      s = '진료 전'; n = `${left(HOURS.open - minutes)} 뒤인 09:00에 엽니다.`;
    } else if (minutes < HOURS.lunchStart) {
      s = '진료 중'; n = `점심시간 12:00까지 ${left(HOURS.lunchStart - minutes)}. 지금 내선 803-7112로 예약할 수 있습니다.`; b = 'OPEN';
    } else if (minutes < HOURS.lunchEnd) {
      s = '점심시간'; n = '13:00에 오후 진료를 시작합니다.'; b = 'LUNCH';
    } else if (minutes < HOURS.close) {
      s = '진료 중'; n = `오늘 진료는 16:00까지, ${left(HOURS.close - minutes)} 남았습니다. 지금 내선 803-7112로 예약할 수 있습니다.`; b = 'OPEN';
    } else {
      s = '오늘 진료 끝'; n = `${tomorrow(day)} 09:00에 다시 엽니다. 예약은 그때 군 전화로 내선 803-7112.`;
    }
    status.textContent = s;
    next.textContent = n;
    if (clock) clock.textContent = `오늘 · ${month}월 ${date}일 (${DAYS[day]})`;
    if (badge) { badge.textContent = b; badge.classList.toggle('is-open', b === 'OPEN'); }
  }
  render();
  setInterval(() => { if (!document.hidden) render(); }, 30 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
})();

(() => {
  // ---------- 2. 의견함: 홈페이지 안에서 적은 글을 구글 폼 응답함으로 보낸다 ----------
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

