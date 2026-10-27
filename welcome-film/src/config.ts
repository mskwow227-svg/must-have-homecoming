/**
 * ─────────────────────────────────────────────────────────────
 *  수정은 이 파일 하나에서. (카피 · 이름 · 색상 · 파일 경로 · 자막)
 * ─────────────────────────────────────────────────────────────
 *  - 시간 단위: 초(seconds). 자막 시간은 "각 영상 안에서의 시간"이다.
 *  - 영상 길이(frames)는 원본 프레임 수이므로 바꾸지 않는다.
 */

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// ── 색상: 메인 1 + 포인트 1 + 블랙/화이트 ────────────────────
export const COLORS = {
  main: "#10303D", // 잉크 네이비 (홈페이지 --ink)
  mainDeep: "#081B23", // 메인 색의 그림자 톤 (배경 그라데이션용)
  point: "#FFE14D", // 옐로 (홈페이지 --yellow)
  white: "#FFFFFF",
  black: "#000000",
};

// ── 폰트 (public/fonts) ───────────────────────────────────────
export const FONTS = {
  display: "Paperlogy", // 굵은 디스플레이
  text: "Pretendard", // 본문·자막
};

// ── 인트로 ────────────────────────────────────────────────────
export const INTRO = {
  frames: 210, // 7.0초
  counterFrom: 1,
  counterTo: 20,
  yearFrom: 2006,
  yearTo: 2026,
  eyebrow: "청소년운영위원회 Must Have",
  titleAccent: "20주년", // 포인트 색
  title: "홈커밍데이",
  bottom: "2006 — 2026",
};

// ── 엔드카드 ──────────────────────────────────────────────────
export const ENDCARD = {
  frames: 150, // 5.0초
  copy: [
    { text: "어서 와요,", accent: false },
    { text: "다시 산울림", accent: true },
  ],
  sub: "함께 만든 20년, 다시 잇는 우리의 이야기",
  date: "2026. 10. 31. SAT",
  logos: ["logos/sanullim-logo.png", "logos/musthave-logo.png"],
};

// ── 로우서드 (이름·역할은 각 CLIPS[i].role. enabled:false 로 끌 수 있음) ──
export const LOWER_THIRD = {
  enabled: true,
  showIndex: true, // "01 / 04" 표시
};

// ── 음악·효과음 볼륨 (0~1) ────────────────────────────────────
export const AUDIO = {
  music: "audio/music.wav",
  musicFull: 0.7, // 인트로 볼륨 (약 -16 LUFS)
  musicDuck: 0.055, // 말하는 구간 (약 -22dB 덕킹)
  musicBreath: 0.16, // 말 사이 긴 쉼(손 흔들기)에서 살짝 올라오는 정도
  // 피날레: 영상 4 외침 직후 빌드업 → 엔드카드에서 터지는 128BPM 앤섬 → 빅 엔딩
  finale: "audio/finale.wav",
  finaleVolume: 0.65, // 약 -14 LUFS (목소리보다 살짝 크게)
  finaleOffset: 116, // 영상 4 안에서 피날레가 시작하는 프레임 (3.87s, make_audio.py FINALE_START와 같아야 함)
  bpm: 128, // 엔드카드 비트 연출도 이 템포를 따름
  voice: 1.0,
  sfx: {
    tick: 0.2,
    impact: 0.45,
    whoosh: 0.6,
    swoosh: 0.22, // 영상 전환 (말이 없는 꼬리 구간에서만 재생)
    sparkle: 0.4,
  },
};

// ── 자막 데이터 타입 ─────────────────────────────────────────
export type Word = {
  t: number; // 단어가 밝아지는 시각 (영상 내 초)
  text: string;
  key?: boolean; // 핵심 단어: 포인트 색 + 확대 + 튀어오름
  join?: boolean; // 앞 단어에 붙여 쓰기 (조사 등)
  br?: boolean; // 이 단어 앞에서 줄바꿈
};
export type Cue = { start: number; end: number; words: Word[]; big?: boolean };

export type Clip = {
  id: number;
  src: string; // 카드에 들어갈 영상 (SDR 변환본, 무음)
  bg: string; // 배경용 블러 사본
  voice: string; // 정규화된 원본 음성
  frames: number; // 원본 프레임 수 (변경 금지)
  role: string; // 로우서드 문구 (이름 + 역할)
  kenBurns: number; // 카드 안 영상 확대 끝값
  breath?: [number, number]; // 음악이 살짝 올라와도 되는 무음 구간 (영상 내 초)
  climax?: boolean; // 영상 4: 대형 키네틱 타이포
  cues: Cue[];
};

// ── 영상 4개 (순서 = 재생 순서) ───────────────────────────────
export const CLIPS: Clip[] = [
  {
    id: 1,
    src: "clips/clip1.mp4",
    bg: "clips/bg1.mp4",
    voice: "audio/voice1.wav",
    frames: 324,
    role: "박시후 위원장",
    kenBurns: 1.04,
    breath: [9.1, 10.45],
    cues: [
      { start: 0.0, end: 2.42, words: [
        { t: 0.0, text: "산울림청소년센터" },
        { t: 1.32, text: "청소년운영위원회" },
      ] },
      { start: 2.42, end: 4.88, words: [
        { t: 2.42, text: "Must" },
        { t: 2.84, text: "Have" },
        { t: 3.1, text: "제20주년", key: true },
        { t: 4.1, text: "홈커밍데이", key: true },
        { t: 4.6, text: "에", join: true },
      ] },
      { start: 4.88, end: 7.3, words: [
        { t: 4.88, text: "오신" },
        { t: 5.22, text: "역대", key: true },
        { t: 5.68, text: "위원", key: true },
        { t: 6.02, text: "및" },
        { t: 6.3, text: "지도자", key: true },
        { t: 6.7, text: "선생님", key: true },
        { t: 7.05, text: "들을", join: true },
      ] },
      { start: 7.3, end: 9.6, big: true, words: [
        { t: 7.3, text: "진심으로", key: true },
        { t: 8.08, text: "환영합니다", key: true },
      ] },
    ],
  },
  {
    id: 2,
    src: "clips/clip2.mp4",
    bg: "clips/bg2.mp4",
    voice: "audio/voice2.wav",
    frames: 283,
    role: "강태우 위원",
    kenBurns: 1.04,
    cues: [
      { start: 0.0, end: 1.78, words: [
        { t: 0.0, text: "20년", key: true },
        { t: 0.34, text: "전", key: true },
        { t: 0.56, text: "첫" },
        { t: 0.88, text: "회의부터" },
        { t: 1.42, text: "지금까지" },
      ] },
      { start: 1.78, end: 4.9, words: [
        { t: 1.78, text: "함께" },
        { t: 2.6, text: "웃고", key: true },
        { t: 3.02, text: "고민하며", key: true },
        { t: 3.78, text: "만들어" },
        { t: 4.2, text: "온" },
      ] },
      { start: 5.21, end: 6.46, words: [
        { t: 5.21, text: "소중한", key: true },
        { t: 5.55, text: "순간들", key: true },
        { t: 5.9, text: "이", join: true },
        { t: 6.08, text: "모여" },
      ] },
      { start: 6.46, end: 8.75, words: [
        { t: 6.46, text: "오늘의" },
        { t: 6.98, text: "20주년", key: true },
        { t: 7.45, text: "을", join: true },
        { t: 7.66, text: "만들었습니다" },
      ] },
    ],
  },
  {
    id: 3,
    src: "clips/clip3.mp4",
    bg: "clips/bg3.mp4",
    voice: "audio/voice3.wav",
    frames: 419,
    role: "김나현 위원",
    kenBurns: 1.02, // 손떨림이 있어 확대를 약하게
    cues: [
      { start: 0.46, end: 3.5, words: [
        { t: 0.46, text: "오늘" },
        { t: 0.7, text: "이" },
        { t: 0.82, text: "자리가" },
        { t: 1.2, text: "과거", key: true },
        { t: 1.55, text: "를", join: true },
        { t: 1.76, text: "추억", key: true },
        { t: 2.1, text: "하는", join: true },
        { t: 2.36, text: "것을" },
        { t: 2.78, text: "넘어" },
      ] },
      { start: 3.77, end: 6.3, words: [
        { t: 3.77, text: "새로운", key: true },
        { t: 4.15, text: "추억", key: true },
        { t: 4.45, text: "을", join: true },
        { t: 4.6, text: "만들어" },
        { t: 4.95, text: "가는" },
        { t: 5.18, text: "시작이" },
        { t: 5.74, text: "되며" },
      ] },
      { start: 6.73, end: 9.75, words: [
        { t: 6.73, text: "그동안의" },
        { t: 7.22, text: "추억을" },
        { t: 7.74, text: "나누고" },
        { t: 8.12, text: "반가운", key: true },
        { t: 8.8, text: "얼굴들", key: true },
        { t: 9.3, text: "과", join: true },
      ] },
      { start: 9.97, end: 13.4, words: [
        { t: 9.97, text: "다시", key: true },
        { t: 10.2, text: "인연", key: true },
        { t: 10.5, text: "을", join: true },
        { t: 10.68, text: "이어" },
        { t: 10.92, text: "가는" },
        { t: 11.12, text: "시간이", br: true },
        { t: 11.54, text: "되었으면" },
        { t: 12.2, text: "좋겠습니다" },
      ] },
    ],
  },
  {
    id: 4,
    src: "clips/clip4.mp4",
    bg: "clips/bg4.mp4",
    voice: "audio/voice4.wav",
    frames: 185,
    role: "위원 일동",
    kenBurns: 1.03,
    climax: true,
    cues: [
      { start: 0.0, end: 5.2, words: [
        { t: 0.0, text: "다시" },
        { t: 0.2, text: "한 번" },
        { t: 0.54, text: "진심으로", key: true, br: true },
        { t: 1.78, text: "환영합니다!", key: true },
      ] },
    ],
  },
];

// ── 레이아웃 ──────────────────────────────────────────────────
export const LAYOUT = {
  card: { width: 1536, height: 864, cx: 960, cy: 498, radius: 32 },
  captionBottom: 54, // 화면 아래에서 자막 pill 아래쪽까지 (px)
  captionSize: 60,
  captionBigSize: 84,
};

// ── 전환 (프레임) ─────────────────────────────────────────────
export const TRANSITION = {
  exit: 6, // 나가는 카드: 자기 영상의 마지막 0.2초 (재생 중)
  enter: 9, // 들어오는 카드: 첫 프레임부터 재생하며 0.3초
};
