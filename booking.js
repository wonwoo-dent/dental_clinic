// 3사단 의무대대 치과 — "내 예약 캘린더에 추가" (노쇼 방지)
// 전화로 잡은 날짜·시간·용건만 받아, 브라우저 안에서 캘린더 파일(.ics)을 만들어 내려받게 한다.
// 이름·군번은 받지 않고, 아무 데도 보내지 않는다. 외부 라이브러리 없음.
// 알림은 진료 '전날' 한 번: 용사는 진료 당일 일과 중 휴대폰이 없으므로 당일 알림은 의미가 없다.

(() => {
  // ---------- 바꿀 수 있는 값 ----------
  const REMIND_HOUR = 18;          // 전날 알림 시각 (부대 휴대폰 사용 시간에 맞춰 조정)
  const REMIND_MINUTE = 0;
  const LONG_KINDS = ['발치', '신경치료']; // 1시간짜리 진료. 나머지는 30분
  const SUMMARY = '치과 진료 (3사단 의무대대 2층)';
  const LOCATION = '3사단 의무대대 2층 치과';
  const DESCRIPTION = '10분 전 도착 · 진료 전 흡연 금지 · 먹는 약 이름 챙기기 · 문의 내선 803-7112(군 전화)';
  const FILE_NAME = 'dental-appointment.ics';
  const SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'];
  // -------------------------------------

  const forms = document.querySelectorAll('[data-addcal]');
  if (!forms.length) return;
  const inKakao = /KAKAOTALK/i.test(navigator.userAgent);
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const pad = (n) => String(n).padStart(2, '0');
  const seoulToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  // 한국 시간(UTC+9, 서머타임 없음) → Date
  const kst = (date, h, m) => { const [y, mo, d] = date.split('-').map(Number); return new Date(Date.UTC(y, mo - 1, d, h - 9, m)); };
  const utc = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const local = (d) => { const k = new Date(d.getTime() + 9 * 3600000); return `${k.getUTCFullYear()}${pad(k.getUTCMonth() + 1)}${pad(k.getUTCDate())}T${pad(k.getUTCHours())}${pad(k.getUTCMinutes())}00`; };
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const enc = new TextEncoder();
  // 한 줄이 75바이트를 넘으면 접는다 (한글은 3바이트라 글자 단위로 센다)
  function fold(line) {
    let out = '', cur = '', bytes = 0;
    for (const ch of line) {
      const b = enc.encode(ch).length;
      if (bytes + b > 73) { out += cur + '\r\n '; cur = ''; bytes = 1; }
      cur += ch; bytes += b;
    }
    return out + cur;
  }

  function times(date, time, kind) {
    const [h, m] = time.split(':').map(Number);
    const start = kst(date, h, m);
    const end = new Date(start.getTime() + (LONG_KINDS.includes(kind) ? 60 : 30) * 60000);
    const remind = kst(date, REMIND_HOUR, REMIND_MINUTE);
    remind.setUTCDate(remind.getUTCDate() - 1);
    return { start, end, remind };
  }
  const details = (kind) => `용건: ${kind}\n${DESCRIPTION}`;

  function buildIcs(date, time, kind) {
    const { start, end, remind } = times(date, time, kind);
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//3사단 의무대대 치과//예약//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@wonwoo-dent.github.io`,
      `DTSTAMP:${utc(new Date())}`,
      `DTSTART:${utc(start)}`,
      `DTEND:${utc(end)}`,
      `SUMMARY:${esc(SUMMARY)}`,
      `LOCATION:${esc(LOCATION)}`,
      `DESCRIPTION:${esc(details(kind))}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY',
      `DESCRIPTION:${esc(`내일 ${time} 치과 진료 · 10분 전 의무대대 2층 · 진료 전 흡연 금지`)}`,
      `TRIGGER;VALUE=DATE-TIME:${utc(remind)}`,
      'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ];
    return lines.map(fold).join('\r\n') + '\r\n';
  }

  function googleUrl(date, time, kind) {
    const { start, end } = times(date, time, kind);
    const q = new URLSearchParams({ action: 'TEMPLATE', text: SUMMARY, dates: `${local(start)}/${local(end)}`, details: details(kind), location: LOCATION, ctz: 'Asia/Seoul' });
    return `https://calendar.google.com/calendar/render?${q.toString()}`;
  }

  function download(ics) {
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    if (isIOS) {
      // 아이폰: 파일을 열면 '캘린더에 추가' 창이 뜬다
      window.location.href = url;
    } else {
      const a = document.createElement('a');
      a.href = url; a.download = FILE_NAME; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 0);
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  forms.forEach((form) => {
    const date = form.querySelector('[name="date"]');
    const time = form.querySelector('[name="time"]');
    const kind = form.querySelector('[name="kind"]');
    const msg = form.querySelector('[data-addcal-msg]');
    const google = form.querySelector('[data-addcal-google]');
    const kakao = form.querySelector('[data-addcal-kakao]');
    if (time && !time.options.length) time.innerHTML = SLOTS.map((t) => `<option>${t}</option>`).join('');
    if (kind && form.dataset.kind) kind.value = form.dataset.kind;
    if (date) date.min = seoulToday();
    if (kakao && inKakao) kakao.hidden = false;

    const valid = () => {
      if (!date.value) { msg.textContent = '전화로 잡은 날짜를 먼저 고르세요.'; date.focus(); return false; }
      const w = new Date(`${date.value}T00:00:00Z`).getUTCDay();
      if (w === 0 || w === 6) { msg.textContent = '토요일과 일요일은 휴진입니다. 날짜를 다시 확인하세요.'; date.focus(); return false; }
      return true;
    };
    const hh = `${pad(REMIND_HOUR)}:${pad(REMIND_MINUTE)}`;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!valid()) return;
      download(buildIcs(date.value, time.value, kind.value));
      msg.textContent = isIOS
        ? `'캘린더에 추가' 창에서 저장하세요. 진료 전날 ${hh}에 알림이 울립니다.`
        : `파일을 내려받았습니다. 삼성 캘린더로 열어 저장하세요. 진료 전날 ${hh}에 알림이 울립니다.`;
    });
    if (google) google.addEventListener('click', () => {
      if (!valid()) return;
      window.open(googleUrl(date.value, time.value, kind.value), '_blank', 'noopener');
      msg.textContent = "구글 캘린더에서 저장하기 전에 알림을 '전날'로 바꿔 주세요.";
    });
  });
})();
