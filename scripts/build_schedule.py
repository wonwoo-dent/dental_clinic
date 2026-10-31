"""의무대대 공용 구글 캘린더에서 치과 군의관 부재를 읽어, 날짜별 '진료 상태'만 data/schedule.json 으로 저장한다.

- 캘린더 주소는 GitHub Secret 의 CAL_MEDICAL 에서 읽는다. 주소와 원본 일정은 어디에도 저장하지 않는다.
- 공개 파일에는 군의관 이름, 누가 언제 비는지, 휴가 종류를 남기지 않는다 (보안).
  평일마다 아래 셋 중 하나만 남긴다. 평소(초진 가능)인 날은 적지 않는다.
    limited : 군의관 한 명 이상이 하루 중 자리를 비움 → 화면에 '재진만'
    closed  : 군의관이 모두 자리를 비움 → 화면에 '휴진'
- 일정 제목은 "연가1) 이원우(5/9일)", "청원휴가3) 이종철" 처럼 "종류번호) 이름" 꼴이다.
- 공휴일은 구글의 공개 '대한민국의 휴일' 캘린더에서 '공휴일'만 가져온다 (기념일은 뺀다).
"""
import json
import os
import re
import sys
import urllib.request
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import icalendar
import recurring_ical_events

KST = ZoneInfo("Asia/Seoul")
OUT = Path(__file__).resolve().parent.parent / "data" / "schedule.json"

# ---------- 바꿀 수 있는 값 ----------
DOCTORS = [
    {"id": "lww", "name": "이원우", "rank": "대위", "role": "구강악안면외과"},
    {"id": "ljc", "name": "이종철", "rank": "대위", "role": "치과보철과"},
]
IGNORE_KINDS = ["당직"]          # 낮 진료에 영향이 없는 일정 종류 (제목 맨 앞 글자로 판단)
AM_WORDS = ["오전"]              # 제목에 있으면 오전만 부재
PM_WORDS = ["오후"]              # 제목에 있으면 오후만 부재
MORNING = (time(9), time(12))
AFTERNOON = (time(13), time(16))
MONTHS_AHEAD = 2                 # 이번 달 + 다음 두 달
HOLIDAY_URL = "https://calendar.google.com/calendar/ical/ko.south_korea%23holiday%40group.v.calendar.google.com/public/basic.ics"
# -------------------------------------


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "dental-clinic-schedule/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def month_add(d: date, n: int) -> date:
    y, m = divmod(d.month - 1 + n, 12)
    return date(d.year + y, m + 1, 1)


def to_local(v):
    """iCal 값(날짜 또는 시각)을 (날짜, 시각 또는 None) 으로. 시각은 한국 시간."""
    if isinstance(v, datetime):
        if v.tzinfo is None:
            v = v.replace(tzinfo=KST)
        return v.astimezone(KST)
    return v


def split_title(summary: str):
    """'연가1) 이원우(5/9일)' -> ('연가', '이원우'). 종류가 없으면 ('', 제목)."""
    s = (summary or "").strip()
    close = s.find(")")
    open_ = s.find("(")
    kind, rest = "", s
    if close != -1 and (open_ == -1 or open_ > close):
        kind = re.sub(r"\s*\d+\s*$", "", s[:close]).strip()
        rest = s[close + 1:]
    names = re.sub(r"\([^)]*\)", " ", rest)
    return kind, names


def name_in(name: str, text: str) -> bool:
    """'이원우', '이원우 대위', '이원우대위' 는 맞고 '김이원우진' 은 아니다."""
    pat = r"(?<![가-힣])" + re.escape(name) + r"(?:(?![가-힣])|(?=대위|군의관|님))"
    return re.search(pat, text) is not None


def overlap(a0, a1, b0, b1) -> bool:
    return a0 < b1 and b0 < a1


def parts_for_timed(start: datetime, end: datetime, day: date):
    """시각이 있는 일정이 그날 오전·오후 진료 시간과 겹치는지."""
    got = set()
    for name, (t0, t1) in (("am", MORNING), ("pm", AFTERNOON)):
        w0 = datetime.combine(day, t0, KST)
        w1 = datetime.combine(day, t1, KST)
        if overlap(start, end, w0, w1):
            got.add(name)
    return got


def merge(cur, new):
    if cur == "day" or new == "day":
        return "day"
    if cur and cur != new:
        return "day"
    return new


def build_away(cal_bytes: bytes, start: date, end: date):
    cal = icalendar.Calendar.from_ical(cal_bytes)
    away = {}
    for ev in recurring_ical_events.of(cal).between(start, end):
        if str(ev.get("STATUS", "")).upper() == "CANCELLED":
            continue
        summary = str(ev.get("SUMMARY", ""))
        kind, names = split_title(summary)
        if any(kind.startswith(k) for k in IGNORE_KINDS):
            continue
        who = [d["id"] for d in DOCTORS if name_in(d["name"], names)]
        if not who:
            continue
        s = to_local(ev.decoded("DTSTART"))
        e = ev.decoded("DTEND") if "DTEND" in ev else None
        e = to_local(e) if e is not None else None
        half = "am" if any(w in summary for w in AM_WORDS) else "pm" if any(w in summary for w in PM_WORDS) else None

        if isinstance(s, datetime):
            e = e or s + timedelta(hours=1)
            d = s.date()
            while d <= (e - timedelta(microseconds=1)).date():
                got = parts_for_timed(s, e, d)
                if got:
                    part = "day" if got == {"am", "pm"} else got.pop()
                    for i in who:
                        mark(away, d, i, part, start, end)
                d += timedelta(days=1)
        else:
            e = e or s + timedelta(days=1)
            d = s
            while d < e:
                for i in who:
                    mark(away, d, i, half or "day", start, end)
                d += timedelta(days=1)
    return away


def mark(away, d: date, doc: str, part: str, start: date, end: date):
    if d < start or d >= end or d.weekday() >= 5:
        return
    k = d.isoformat()
    away.setdefault(k, {})
    away[k][doc] = merge(away[k].get(doc), part)


def day_status(away):
    """군의관별 부재를 날짜별 상태로 줄인다. 이름은 여기서 버린다."""
    out = {}
    for k, who in sorted(away.items()):
        if not who:
            continue
        if all(who.get(d["id"]) == "day" for d in DOCTORS):
            out[k] = "closed"
        else:
            out[k] = "limited"
    return out


def build_holidays(cal_bytes: bytes, start: date, end: date):
    cal = icalendar.Calendar.from_ical(cal_bytes)
    out = {}
    for ev in recurring_ical_events.of(cal).between(start, end):
        if not str(ev.get("DESCRIPTION", "")).startswith("공휴일"):
            continue
        s = ev.decoded("DTSTART")
        s = s.date() if isinstance(s, datetime) else s
        e = ev.decoded("DTEND") if "DTEND" in ev else s + timedelta(days=1)
        e = e.date() if isinstance(e, datetime) else e
        d = s
        while d < e:
            if start <= d < end:
                name = str(ev.get("SUMMARY", "")).strip()
                if name.startswith("쉬는 날 "):
                    name = name[len("쉬는 날 "):] + " 대체공휴일"
                out[d.isoformat()] = name
            d += timedelta(days=1)
    return out


def main():
    url = os.environ.get("CAL_MEDICAL", "").strip()
    if not url:
        sys.exit("CAL_MEDICAL 이 비어 있습니다. GitHub 저장소 Settings → Secrets and variables → Actions 에 넣어 주세요.")

    today = datetime.now(KST).date()
    start = today.replace(day=1)
    end = month_add(start, MONTHS_AHEAD + 1)

    old = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}

    try:
        away = build_away(fetch(url), start, end)
    except Exception as e:  # 주소가 틀리거나 구글이 응답하지 않을 때: 원인만 남기고 실패한다 (주소는 찍지 않는다)
        sys.exit(f"진료 캘린더를 읽지 못했습니다: {type(e).__name__}")

    try:
        holidays = build_holidays(fetch(HOLIDAY_URL), start, end)
    except Exception as e:
        print(f"공휴일 캘린더를 읽지 못해 지난 값을 씁니다: {type(e).__name__}")
        holidays = {k: v for k, v in old.get("holidays", {}).items() if start.isoformat() <= k < end.isoformat()}

    data = {
        "from": start.isoformat(),
        "to": (end - timedelta(days=1)).isoformat(),
        "holidays": dict(sorted(holidays.items())),
        "days": day_status(away),
    }
    same = {k: v for k, v in old.items() if k != "updated"} == data
    data["updated"] = old.get("updated") if same and old.get("updated") else datetime.now(KST).replace(microsecond=0).isoformat()
    if same:
        print("바뀐 일정이 없습니다.")
        return
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"저장: 재진만 {list(data['days'].values()).count('limited')}일, 휴진 {list(data['days'].values()).count('closed')}일, 공휴일 {len(holidays)}일, {data['from']} ~ {data['to']}")


if __name__ == "__main__":
    main()
