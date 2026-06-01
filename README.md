# 🦘 Sydney Travel Plan

인터랙티브 시드니 5박 6일 여행 플래너 — Google Sheets 연동, GitHub Pages 배포

## 🚀 GitHub Pages 배포 방법

### 1단계 — 리포지토리 생성 & 파일 업로드

1. GitHub에서 새 **public** 리포지토리 생성 (예: `sydney-travel`)
2. `plan_gsheets.html` 파일을 리포지토리에 업로드
3. 파일 이름을 `index.html`로 변경하거나, 처음부터 `index.html`로 업로드

### 2단계 — Google Sheets 공유 설정 확인

> **중요!** 시트가 공개되어 있어야 합니다.

1. Google Sheets 열기 → 우측 상단 **공유** 버튼 클릭
2. **링크가 있는 모든 사용자** → **뷰어** 로 설정
3. 링크 복사 (이미 `plan_gsheets.html`에 Sheet ID가 하드코딩되어 있습니다)

현재 연동된 Sheet ID: `1A5YDClkB7E2IlULZU3SMbgy20qIZo21Jphj-fyqAV6o`

### 3단계 — GitHub Pages 활성화

1. 리포지토리 → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / `(root)` 선택 → **Save**
4. 약 1~2분 후 `https://<username>.github.io/<repo-name>/` 에서 접속 가능

---

## 📊 데이터 수정 방법

여행 일정, 맛집, 팁을 수정하려면 Google Sheets만 편집하면 됩니다.  
HTML 파일을 건드릴 필요 없이 **시트 저장 즉시 반영**됩니다.

| 시트 이름 | 내용 |
|-----------|------|
| `schedule` | 전체 여행 일정 (타임라인) |
| `food` | 추천 맛집 목록 |
| `tips` | 여행 팁 |
| `sights` | 주요 관광지 |
| `map_places` | 지도 마커 위치 |

---

## 🔧 Sheet ID 변경 방법

다른 스프레드시트를 사용하려면 `index.html` 안의 아래 줄을 수정:

```js
const SHEET_ID = '여기에_새_SHEET_ID_입력';
```

Sheet ID는 Google Sheets URL에서 확인:  
`https://docs.google.com/spreadsheets/d/`**`여기가_SHEET_ID`**`/edit`
