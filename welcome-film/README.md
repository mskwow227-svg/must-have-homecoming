# 홈커밍데이 환영 오프닝 영상 (Remotion)

산울림청소년센터 청소년운영위원회 Must Have 20주년 홈커밍데이(2026.10.31) 오프닝 영상.
**52.367초 · 1920×1080 · 30fps · H.264** — 인트로 7초 + 환영인사 영상 4개(원본 그대로 40.367초) + 엔드카드 5초.

**완성본: `out/homecoming_welcome.mp4`** (H.264 CRF 18 · AAC 320k · 41MB). 검수 결과는 [`qa_report.md`](qa_report.md).

## 폴더 구조

```
welcome-film/
├─ src/
│  ├─ config.ts          ← ★ 수정은 여기서 (카피·색·폰트·자막·볼륨·파일 경로)
│  ├─ timeline.ts        영상 4개 프레임 위치 자동 계산 (수정 불필요)
│  ├─ Homecoming.tsx     전체 조립: 인트로 → 영상 4개 → 엔드카드 + 사운드
│  ├─ scenes/
│  │  ├─ Intro.tsx       01→20 카운터, 0 속으로 줌인, 키네틱 타이틀
│  │  ├─ VideoSection.tsx  Series로 영상 4개 연속 + 경계 라이트 스윕
│  │  ├─ ClipScene.tsx   영상 1개: 블러 배경 · 카드 · Ken Burns · 전환
│  │  └─ EndCard.tsx     환영 카피 · 날짜 · 로고
│  ├─ components/        자막, 로우서드, 클라이맥스 타이포·컨페티, 그레인·라이트 리크
│  └─ audio/Soundtrack.tsx  음악 덕킹 커브 · 효과음 배치
├─ scripts/
│  ├─ prep.py            원본 → 작업본 (HDR→SDR, 음량 정규화)
│  ├─ make_audio.py      오리지널 음악·피날레·효과음 합성
│  └─ qa.py              최종본 자체 검수 → analysis/qa/
├─ public/               폰트·로고·작업본 영상·오디오
├─ transcript.md         대본 (타임코드)
├─ storyboard.md         구성안
└─ qa_report.md          자체 검수 보고서
```

## 처음 실행할 때

필요: Node.js 18+, Python 3.10+ (numpy), ffmpeg/ffprobe (PATH에 있어야 함)

```bash
npm install
npm run prep        # 원본 4개 → public/clips, public/audio (몇 분 걸림)
npm run studio      # 브라우저에서 미리보기 (http://localhost:3000)
npm run render      # out/homecoming_welcome.mp4 (H.264, CRF 18, AAC) — 약 5~10분
python scripts/qa.py  # 렌더 후 검수 (경계 스틸·음성 연속성·자막 대조)
```

> 카피나 자막만 고쳤다면 `npm run prep`은 다시 할 필요 없이 `npm run render`만 하면 됩니다.

원본 경로: `../★홈커밍데이 준비 폴더/환영인사 영상/1.mp4 ~ 4.mp4` (`scripts/prep.py`의 `SRC`).

## 자주 고칠 곳 (`src/config.ts`)

| 바꾸고 싶은 것 | 위치 |
|---|---|
| 인트로 타이틀 문구 | `INTRO.eyebrow / titleAccent / title / bottom` |
| 엔드카드 카피·날짜 | `ENDCARD.copy / sub / date` |
| 로우서드 이름·역할 | 각 `CLIPS[i].role` |
| 로우서드 끄기 / "01 / 04" 숨기기 | `LOWER_THIRD.enabled / showIndex` |
| 자막 문구·띄어쓰기 | `CLIPS[i].cues[].words[].text` |
| 자막 타이밍 | `words[].t` (각 영상 안에서의 초), `cues[].start/end` |
| 핵심 단어 강조 | 단어에 `key: true` |
| 색상 | `COLORS.main` (네이비) / `COLORS.point` (옐로) |
| 음악·효과음 볼륨 | `AUDIO` (`musicDuck` = 말하는 구간 음악 크기, `finaleVolume` = 엔드카드 피날레) |
| 자막 크기 | `LAYOUT.captionSize / captionBigSize` |

> 자막에서 붙여 써야 하는 조사는 `join: true`, 줄을 바꿀 단어는 `br: true`.

## 지켜야 할 규칙 (코드에 반영됨)

- 영상 4개는 **원본 프레임 수 그대로** `Series`로 이어 붙인다 (`CLIPS[].frames` 변경 금지).
- 영상 사이 전환은 화면만 움직인다. 나가는 카드는 자기 영상의 마지막 0.2초 동안(재생 중), 들어오는 카드는 첫 프레임부터 재생하며 0.3초 동안 움직인다. 정지 화면은 쓰지 않는다.
- 음성은 영상마다 -16 LUFS로 맞췄고, 경계에는 5ms 마이크로 페이드만 들어간다.
- 음악은 `scripts/make_audio.py`로 직접 합성한 오리지널 (외부 음원 없음).
  - `music.wav`: 인트로~영상 구간의 잔잔한 테마 (말하는 구간 약 -22dB 덕킹)
  - `finale.wav`: 영상 4 외침 직후(45.07s) 빌드업 → 엔드카드 첫 프레임에서 터지는 128BPM 앤섬 → 51.1s 빅 엔딩.
    엔드카드의 빛 맥동·컨페티도 `AUDIO.bpm`에 맞춰 움직인다. 피날레 시작점을 바꾸면 `AUDIO.finaleOffset`과
    `make_audio.py`의 `FINALE_START`를 같이 바꿔야 한다.

## 작업본(전처리) 내용

| 항목 | 처리 |
|---|---|
| 색 | 아이폰 HLG HDR → SDR BT.709 (mobius 톤매핑) |
| 프레임 | 30fps 고정, 원본과 같은 프레임 수 (324 / 283 / 419 / 185) |
| 음성 | 70Hz 하이패스 → 가벼운 노이즈 감소(10dB) → -16 LUFS → 리미터(-1.5dBTP) → 5ms 페이드 |
| 배경 | 블러 사본 `bgN.mp4` (384×216) |
