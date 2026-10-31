// 3사단 의무대대 치과 — 진료 일정 달력
// data/schedule.json 은 GitHub Actions 가 한 시간마다 구글 캘린더에서 만들어 둔다 (scripts/build_schedule.py).
// 평일만 보여 주고, 날마다 진료하는 군의관을 표시한다. 휴가 종류는 파일에도 화면에도 없다.

(() => {
  const roots = Array.from(document.querySelectorAll('[data-cal]'));
  const docLine = document.getElementById('now-docs');
  if (!roots.length && !docLine) return;

  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  const PHONE = '부대 내선 803-7112';
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const parse = (k) => new Date(`${k}T00:00:00Z`);
  const keyOf = (d) => d.toISOString().slice(0, 10);
  const addDays = (k, n) => { const d = parse(k); d.setUTCDate(d.getUTCDate() + n); return keyOf(d); };
  const seoulToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const md = (k) => { const d = parse(k); return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${DOW[d.getUTCDay()]})`; };

  // 그날의 상태: 휴진(주말·공휴일) 또는 진료하는 군의관 목록
  function dayInfo(k, data) {
    const w = parse(k).getUTCDay();
    if (w === 0 || w === 6) return { closed: true, label: '휴진' };
    if (data.holidays[k]) return { closed: true, label: data.holidays[k] };
    const away = data.away[k] || {};
    const docs = [];
    data.doctors.forEach((doc, i) => {
      const a = away[doc.id];
      if (a === 'day') return;
      docs.push({ ...doc, i, part: a === 'am' ? '오후' : a === 'pm' ? '오전' : '' });
    });
    return { closed: false, docs };
  }
  const who = (docs) => docs.length
    ? docs.map((d) => `${d.name} ${d.rank}${d.part ? ` (${d.part}만)` : ''}`).join(' · ')
    : '치과 군의관이 모두 자리를 비웁니다';
  const inRange = (k, data) => k >= data.from && k <= data.to;

  function todayText(data, today) {
    if (!inRange(today, data)) return { head: '진료 일정 정보가 없습니다', sub: `${PHONE}로 확인하세요.` };
    const t = dayInfo(today, data);
    if (!t.closed && !t.docs.length) return { head: `오늘 ${md(today)}은 치과 군의관이 모두 자리를 비웁니다`, sub: `${PHONE}로 확인하세요.` };
    if (!t.closed) return { head: `오늘 ${md(today)} 진료`, sub: who(t.docs) };
    let k = addDays(today, 1);
    while (inRange(k, data) && dayInfo(k, data).closed) k = addDays(k, 1);
    const reason = t.label === '휴진' ? '' : ` · ${t.label}`;
    if (!inRange(k, data)) return { head: `오늘은 휴진입니다${reason}`, sub: '' };
    return { head: `오늘은 휴진입니다${reason}`, sub: `다음 진료일 ${md(k)} · ${who(dayInfo(k, data).docs)}` };
  }

  function updatedText(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const p = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
    const g = (t) => p.find((x) => x.type === t)?.value;
    return ` 마지막 변경 ${g('month')}월 ${g('day')}일 ${g('hour')}:${g('minute')}.`;
  }

  const chevron = (dir) => `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${dir === 'l' ? 'M12.5 4 6.5 10l6 6' : 'M7.5 4l6 6-6 6'}" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;

  function mount(root, data) {
    const today = seoulToday();
    const firstYm = data.from.slice(0, 7);
    const lastYm = data.to.slice(0, 7);
    // 처음에는 오늘 또는 그 뒤 첫 평일이 있는 달을 연다 (이번 달 평일이 다 지났으면 다음 달)
    let start = today;
    while ([0, 6].includes(parse(start).getUTCDay())) start = addDays(start, 1);
    let ym = start.slice(0, 7);
    if (ym < firstYm) ym = firstYm;
    if (ym > lastYm) ym = lastYm;

    const t = todayText(data, today);
    root.innerHTML = `
      <p class="cal__today">${esc(t.head)}${t.sub ? `<span>${esc(t.sub)}</span>` : ''}</p>
      <div class="cal__bar">
        <h3 class="cal__month nums" aria-live="polite" data-month></h3>
        <div class="cal__navs">
          <button class="cal__nav" type="button" data-step="-1" aria-label="이전 달">${chevron('l')}</button>
          <button class="cal__nav" type="button" data-step="1" aria-label="다음 달">${chevron('r')}</button>
        </div>
      </div>
      <ol class="cal__head" aria-hidden="true"><li>월</li><li>화</li><li>수</li><li>목</li><li>금</li></ol>
      <ol class="cal__grid" data-grid></ol>
      <ul class="cal__legend">
        ${data.doctors.map((d, i) => `<li><span class="cal__doc cal__doc--${i}">${esc(d.name)}</span>${esc(d.rank)} · ${esc(d.role)}</li>`).join('')}
      </ul>
      <p class="cal__note small muted">의무대대 진료 캘린더에서 한 시간마다 가져옵니다.${updatedText(data.updated)} 휴가와 출장으로 바뀔 수 있으니 오기 전에 전화로 확인하세요.</p>`;

    const monthEl = root.querySelector('[data-month]');
    const grid = root.querySelector('[data-grid]');
    const [prev, next] = root.querySelectorAll('.cal__nav');

    function draw() {
      const [y, m] = ym.split('-').map(Number);
      monthEl.textContent = `${y}년 ${m}월`;
      prev.disabled = ym <= firstYm;
      next.disabled = ym >= lastYm;
      const first = `${ym}-01`;
      const w1 = parse(first).getUTCDay();
      let html = '';
      for (let b = 0; b < (w1 >= 1 && w1 <= 5 ? w1 - 1 : 0); b++) html += '<li class="cal__blank" aria-hidden="true"></li>';
      for (let k = first; k.slice(0, 7) === ym; k = addDays(k, 1)) {
        const w = parse(k).getUTCDay();
        if (w === 0 || w === 6) continue;
        const n = Number(k.slice(8));
        const info = inRange(k, data) ? dayInfo(k, data) : { closed: false, docs: null };
        const cls = ['cal__day'];
        if (k < today) cls.push('is-past');
        if (k === today) cls.push('is-today');
        if (info.closed) cls.push('is-closed');
        let body, label;
        if (info.closed) {
          body = `<span class="cal__off">${esc(info.label)}</span>`;
          label = info.label;
        } else if (!info.docs) {
          body = '<span class="cal__off">미정</span>';
          label = '일정 미정';
        } else if (!info.docs.length) {
          body = '<span class="cal__off">군의관 부재</span>';
          label = '군의관 부재, 전화로 확인';
        } else {
          body = info.docs.map((d) => `<span class="cal__doc cal__doc--${d.i}">${esc(d.name)}${d.part ? ` <i>${d.part}</i>` : ''}</span>`).join('');
          label = `${who(info.docs)} 진료`;
        }
        html += `<li class="${cls.join(' ')}" aria-label="${m}월 ${n}일 ${DOW[w]}요일${k === today ? ' 오늘' : ''}, ${esc(label)}">
          <span class="cal__date" aria-hidden="true"><b>${n}</b><span class="cal__dow">${DOW[w]}</span>${k === today ? '<span class="cal__tag">오늘</span>' : ''}</span>
          <span class="cal__docs" aria-hidden="true">${body}</span></li>`;
      }
      grid.innerHTML = html;
    }
    root.querySelectorAll('.cal__nav').forEach((btn) => btn.addEventListener('click', () => {
      const [y, m] = ym.split('-').map(Number);
      const d = new Date(Date.UTC(y, m - 1 + Number(btn.dataset.step), 1));
      ym = keyOf(d).slice(0, 7);
      draw();
    }));
    draw();
  }

  function fail(root) {
    root.innerHTML = `<p class="cal__empty">진료 일정을 불러오지 못했습니다. ${PHONE}로 확인하세요.</p>`;
  }

  fetch('data/schedule.json', { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((data) => {
      roots.forEach((root) => mount(root, data));
      const today = seoulToday();
      if (docLine && inRange(today, data)) {
        const t = dayInfo(today, data);
        if (!t.closed) { docLine.textContent = t.docs.length ? `오늘 진료: ${who(t.docs)}` : '오늘은 치과 군의관이 모두 자리를 비웁니다'; docLine.hidden = false; }
      }
    })
    .catch(() => roots.forEach(fail));
})();
