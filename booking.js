// 3사단 의무대대 치과 — "내 예약 캘린더에 추가"
// 전화로 잡은 예약 날짜와 시간을 받아 .ics 파일을 휴대폰 안에서 만든다. 아무 데도 보내지 않는다.
// 알림: 전날 19:00 (일과 후 휴대폰을 보는 시간), 그리고 1시간 전.

(() => {
  const forms = document.querySelectorAll('[data-addcal]');
  if (!forms.length) return;

  const PLACE = '3사단 의무대대 2층 치과 진료실';
  const EXT = '부대 내선 803-7112';
  const PAGE = 'https://wonwoo-dent.github.io/dental_clinic/hours.html';
  const SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'];
  const pad = (n) => String(n).padStart(2, '0');
  const seoulToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  // 한국 시간(UTC+9, 서머타임 없음)을 UTC 문자열로
  const utc = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const kst = (date, time) => { const [y, m, d] = date.split('-').map(Number); const [h, mi] = time.split(':').map(Number); return new Date(Date.UTC(y, m - 1, d, h - 9, mi)); };
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  // 한 줄 75바이트 넘으면 접는다 (한글은 3바이트라 글자 단위로 센다)
  const enc = new TextEncoder();
  function fold(line) {
    let out = '', cur = '', bytes = 0;
    for (const ch of line) {
      const b = enc.encode(ch).length;
      if (bytes + b > 73) { out += cur + '\r\n '; cur = ''; bytes = 1; }
      cur += ch; bytes += b;
    }
    return out + cur;
  }

  function build(date, time, kind) {
    const start = kst(date, time);
    const end = new Date(start.getTime() + 30 * 60000);
    const eve = kst(date, '19:00'); eve.setUTCDate(eve.getUTCDate() - 1);
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//3사단 의무대대 치과//예약//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${Date.now()}-${Math.random().toString(36).slice(2, 10)}@wonwoo-dent.github.io`,
      `DTSTAMP:${utc(new Date())}`,
      `DTSTART:${utc(start)}`,
      `DTEND:${utc(end)}`,
      `SUMMARY:${esc(`치과 예약 · ${kind}`)}`,
      `LOCATION:${esc(PLACE)}`,
      `DESCRIPTION:${esc(`10분 전에 오세요. 신분증과 의뢰서는 필요 없고 군번만 알면 됩니다.\n날짜를 바꾸려면 일과 시간(평일 09:00–16:00)에 군 전화로 ${EXT}.\n안내: ${PAGE}`)}`,
      `URL:${PAGE}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(`내일 ${time} 치과 예약 (${kind})`)}`, `TRIGGER;VALUE=DATE-TIME:${utc(eve)}`, 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(`1시간 뒤 치과 예약 (${kind})`)}`, 'TRIGGER:-PT1H', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ];
    return lines.map(fold).join('\r\n') + '\r\n';
  }

  function save(ics, name) {
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (ios) { window.location.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`; return; }
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 0);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  forms.forEach((form) => {
    const date = form.querySelector('[name="date"]');
    const time = form.querySelector('[name="time"]');
    const kind = form.querySelector('[name="kind"]');
    const msg = form.querySelector('[data-addcal-msg]');
    if (time && !time.options.length) time.innerHTML = SLOTS.map((t) => `<option>${t}</option>`).join('');
    if (kind && form.dataset.kind) kind.value = form.dataset.kind;
    if (date) date.min = seoulToday();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!date.value) { msg.textContent = '예약한 날짜를 먼저 고르세요.'; date.focus(); return; }
      const w = new Date(`${date.value}T00:00:00Z`).getUTCDay();
      if (w === 0 || w === 6) { msg.textContent = '토요일과 일요일은 휴진입니다. 날짜를 다시 확인하세요.'; date.focus(); return; }
      save(build(date.value, time.value, kind.value), `dental-${date.value}.ics`);
      msg.textContent = '캘린더 파일을 만들었습니다. 파일을 열면 휴대폰 캘린더에 들어가고, 전날 저녁 7시에 알림이 옵니다. 카카오톡 안에서 안 되면 메뉴의 "다른 브라우저로 열기"를 눌러 주세요.';
    });
  });
})();
