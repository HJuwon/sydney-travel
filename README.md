# Sydney Travel Plan 🗺️

Google Sheets를 데이터 소스로 사용하는 시드니 여행 일정 웹앱.
일정 · 맛집 · 관광지 · 여행 팁을 타임라인 + 지도로 보고, **앱 안에서 직접 항목을 추가**하고 카드별 메모를 남길 수 있습니다.

## 폴더 구조

```
sydney-travel/
├── index.html          ← 뼈대 HTML
├── config.js           ← SHEET_ID · GAS_URL 설정
├── apps-script.gs      ← Google Apps Script 웹앱 코드 (메모 저장 + 항목 추가)
├── css/
│   └── style.css       ← 모든 스타일
└── js/
    ├── data.js         ← 데이터 로드 (Google Sheets CSV) · 부팅
    ├── memo.js         ← 메모 저장/불러오기 (Apps Script)
    ├── map.js          ← Leaflet 지도 · 마커 · 경로선
    ├── render.js       ← 카드/타임라인 렌더링 · 찜 · 추가 버튼
    ├── add.js          ← 항목 추가 모달 (시트에 행 추가)
    ├── search.js       ← 전체 검색 (⌘K / Ctrl+K)
    ├── info.js         ← 정보 탭 (항공/환율/숙소/교통/예산/체크리스트)
    └── ui.js           ← 날씨 · 다크모드 · 시계 · 필터 · 모바일 토글
```

> 스크립트는 ES 모듈이 아닌 일반 `<script>`로 전역 스코프를 공유합니다.
> 로드 순서는 `index.html` 하단에 정의되어 있습니다.

## 실행

정적 파일이므로 서버 없이 `index.html`을 열어도 동작합니다.
단, 일부 브라우저는 `file://`에서 fetch가 막히므로 간단한 서버 권장:

```bash
# 저장소 폴더에서
python -m http.server 8000
# → http://localhost:8000
```

GitHub Pages로 배포 시 저장소 **Settings → Pages → Branch: main / root** 선택.

## 데이터 (Google Sheets)

`config.js`의 `SHEET_ID`가 가리키는 스프레드시트에서 다음 탭을 CSV로 읽습니다.
시트 공유는 **"링크가 있는 모든 사용자 (뷰어)"** 로 설정해야 합니다.

| 시트 | 주요 컬럼 |
|------|-----------|
| `schedule` | day, date, title1, order, time, name, type, description, tags, lat, lng, addr, transit_next, transit_info |
| `food`     | day, name, emoji, description, price_level, bg_color, lat, lng, addr |
| `tips`     | day, icon, title, content |
| `sights`   | day, icon, title, description |
| `info`     | category, icon, label, value (category: flight/exchange/hotel/transport/budget/checklist) |
| `memos`    | id, memo, updated  *(Apps Script가 자동 생성)* |

`type` 값: `sight` `food` `coffee` `shop` `activity` `hotel` `transit`

## 항목 추가 · 메모 저장 (Apps Script)

앱 안에서 **+ 추가** 버튼으로 일정/맛집/팁/관광지를 입력하면 Apps Script를 통해
해당 시트에 행이 추가됩니다. 각 카드의 **✏️ 수정** 버튼을 누르면 같은 창이 기존 값이
채워진 채로 열리고, 저장하면 해당 행이 업데이트됩니다. 카드 메모도 같은 경로로 저장됩니다.
(`day` · `순서(order)` 입력은 0 이상만 허용)

### 설정

1. [script.google.com](https://script.google.com) → 새 프로젝트
2. `apps-script.gs` 내용을 **전체 복사 → 붙여넣기**
3. 상단의 `SHEET_ID`가 본인 스프레드시트 ID와 일치하는지 확인
4. **배포 → 새 배포 → 유형: 웹앱**
   - 실행: 나(소유자)
   - 액세스 권한: **모든 사용자**
5. 생성된 `.../exec` URL을 `config.js`의 `GAS_URL`에 입력
   (또는 앱 상단 노란 배너 입력창에 붙여넣고 저장)

> ⚠️ Apps Script 코드를 수정하면 **"배포 관리 → 편집 → 새 버전"** 으로
> 재배포해야 변경(항목 추가 기능 포함)이 반영됩니다.
> 기존에 메모용으로만 배포했다면 반드시 한 번 재배포하세요.

## 주요 기능

- 📅 일자별 타임라인 · 카테고리(일정/맛집/관광지/팁) 필터 · 유형 칩 필터
- 🗺️ Leaflet 지도 마커 · 일자별 이동 경로선 · Google Maps 연동
- ➕ 앱 내 항목 추가 (시트 동기화)
- 📝 카드별 메모 (시트 + localStorage 이중 저장)
- ❤️ 찜 목록 · 🔍 전체 검색(⌘K) · 🌓 다크모드
- 🌤️ 실시간 시드니 날씨 · 💱 실시간 AUD↔KRW 환율 · 🕐 현지 시계
- 📱 모바일 반응형 (지도 접기/펼치기)
