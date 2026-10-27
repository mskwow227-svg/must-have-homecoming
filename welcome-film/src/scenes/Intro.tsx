import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Bokeh, InkBackdrop, LightLeaks } from "../components/Atmosphere";
import { Card } from "../components/Card";
import { COLORS, FONTS, INTRO } from "../config";
import { clamp, easeIn, easeInOut, easeOut, pop, prog } from "../lib/motion";

// ── 타이밍 (프레임) ──
const COUNT_START = 18; // 0.6s
const COUNT_END = 90; // 3.0s  "20"에서 멈춤
const ZOOM_START = 99; // 3.3s  0 속으로
const ZOOM_END = 121; // 4.03s
const TITLE_IN = 120; // 4.0s
const TITLE_OUT = 174; // 5.8s
const CARD_IN = 188; // 6.27s

// ── 숫자 지오메트리 ──
const DIGIT_SIZE = 520;
const DIGIT_W = 330; // 숫자 한 칸 폭 (고정폭으로 배치해 0의 위치를 알 수 있게)
const NUM_CY = 470; // 숫자 줄의 세로 중심
// "0" 안쪽 구멍(카운터)의 중심과 반지름: 화면이 열리는 창
export const HOLE = { cx: 1126, cy: NUM_CY - 1, rx: 71, ry: 124 }; // 렌더 스틸에서 실측

/** 카운터 값 (1 → 20, 끝으로 갈수록 느려짐). 효과음 타이밍도 이 함수를 쓴다. */
export const counterValue = (frame: number) => {
  const p = interpolate(frame, [COUNT_START, COUNT_END], [0, 1], clamp);
  const eased = 1 - Math.pow(1 - p, 3.2);
  return INTRO.counterFrom + (INTRO.counterTo - INTRO.counterFrom) * eased;
};

/** "20" 정지 순간의 펀치 (구멍 마스크도 같은 배율로 따라감) */
const punchAt = (frame: number) =>
  prog(frame, COUNT_END - 2, COUNT_END + 2, easeOut) - prog(frame, COUNT_END + 2, COUNT_END + 16, easeInOut);

const pad2 = (n: number) => String(n).padStart(2, "0");

/** 한 자리 숫자 롤링 */
const Digit: React.FC<{ cur: string; next: string; roll: number }> = ({ cur, next, roll }) => (
  <div style={{ width: DIGIT_W, height: DIGIT_SIZE, overflow: "hidden", position: "relative" }}>
    {[cur, next].map((d, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `translateY(${(i - roll) * DIGIT_SIZE * 0.92}px)`,
          filter: roll > 0 && roll < 1 ? `blur(${Math.sin(roll * Math.PI) * 6}px)` : undefined,
        }}
      >
        {d}
      </div>
    ))}
  </div>
);

const Counter: React.FC<{ frame: number }> = ({ frame }) => {
  const v = counterValue(frame);
  const n = Math.min(Math.floor(v + 1e-6), INTRO.counterTo);
  const f = n >= INTRO.counterTo ? 0 : v - n;
  // 소수부의 마지막 45%에서만 굴러감 → 틱틱 끊기는 리듬
  const roll = easeOut(Math.min(1, Math.max(0, (f - 0.55) / 0.45)));
  const cur = pad2(n);
  const nxt = pad2(Math.min(n + 1, INTRO.counterTo));
  const year = Math.round(INTRO.yearFrom + ((v - INTRO.counterFrom) / (INTRO.counterTo - INTRO.counterFrom)) * (INTRO.yearTo - INTRO.yearFrom));

  const appear = prog(frame, COUNT_START - 10, COUNT_START + 6, easeOut);
  const punch = punchAt(frame);
  const yearOut = prog(frame, ZOOM_START - 4, ZOOM_START + 4, easeIn);

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 960 - DIGIT_W,
          top: NUM_CY - DIGIT_SIZE / 2,
          display: "flex",
          fontFamily: FONTS.display,
          fontWeight: 900,
          fontSize: DIGIT_SIZE,
          lineHeight: 1,
          color: COLORS.white,
          opacity: appear,
          transform: `scale(${1 + 0.07 * punch}) translateY(${(1 - appear) * 30}px)`,
          transformOrigin: `${DIGIT_W}px ${DIGIT_SIZE / 2}px`,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <Digit cur={cur[0]} next={nxt[0]} roll={cur[0] === nxt[0] ? 0 : roll} />
        <Digit cur={cur[1]} next={nxt[1]} roll={cur[1] === nxt[1] ? 0 : roll} />
      </div>
      <div
        style={{
          position: "absolute",
          top: NUM_CY + DIGIT_SIZE / 2 + 6,
          width: 1920,
          textAlign: "center",
          fontFamily: FONTS.text,
          fontWeight: 700,
          fontSize: 44,
          letterSpacing: "0.32em",
          color: COLORS.point,
          opacity: appear * (1 - yearOut),
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {year}
      </div>
    </>
  );
};

/** "20" 정지 순간 퍼지는 링 + 플래시 */
const StopBurst: React.FC<{ frame: number }> = ({ frame }) => {
  const r = prog(frame, COUNT_END, COUNT_END + 26, easeOut);
  const flash = 1 - prog(frame, COUNT_END, COUNT_END + 10, easeOut);
  if (frame < COUNT_END) return null;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 960 - (300 + 700 * r),
          top: NUM_CY - (300 + 700 * r),
          width: 2 * (300 + 700 * r),
          height: 2 * (300 + 700 * r),
          borderRadius: "50%",
          border: `${10 * (1 - r) + 1}px solid ${COLORS.point}`,
          opacity: (1 - r) * 0.9,
        }}
      />
      <AbsoluteFill style={{ background: "white", opacity: flash * 0.22 }} />
    </>
  );
};

/** 0 너머의 세계: 메인 색 배경 + 빛 + 타이틀 */
const World: React.FC<{ frame: number }> = ({ frame }) => {
  const glow = 1 - prog(frame, ZOOM_END - 4, ZOOM_END + 30, easeInOut);
  return (
    <AbsoluteFill>
      <InkBackdrop />
      <LightLeaks intensity={0.9} />
      <Bokeh opacity={prog(frame, ZOOM_END, ZOOM_END + 30)} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${HOLE.cx}px ${HOLE.cy}px, rgba(255,252,236,${glow}) 0%, rgba(255,228,170,${0.97 * glow}) 30%, rgba(255,190,110,${0.7 * glow}) 60%, rgba(255,170,90,0) 100%)`,
        }}
      />
      <Title frame={frame} />
      <EmptyCard frame={frame} />
    </AbsoluteFill>
  );
};

const SpringChars: React.FC<{
  text: string;
  frame: number;
  at: number;
  stagger: number;
  style?: React.CSSProperties;
}> = ({ text, frame, at, stagger, style }) => (
  <span style={{ display: "inline-flex", ...style }}>
    {Array.from(text).map((ch, i) => {
      const s = pop(frame, at + i * stagger, { damping: 13, stiffness: 160 });
      return (
        <span
          key={i}
          style={{
            display: "inline-block",
            whiteSpace: "pre",
            opacity: Math.min(1, s * 1.4),
            transform: `translateY(${(1 - s) * 60}px)`,
            filter: `blur(${Math.max(0, (1 - s) * 10)}px)`,
          }}
        >
          {ch}
        </span>
      );
    })}
  </span>
);

const Title: React.FC<{ frame: number }> = ({ frame }) => {
  const out = prog(frame, TITLE_OUT, TITLE_OUT + 16, easeIn);
  const bar = prog(frame, TITLE_IN + 26, TITLE_IN + 46, easeOut);
  const bottom = prog(frame, TITLE_IN + 34, TITLE_IN + 52, easeOut);
  if (frame < TITLE_IN - 2) return null;
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        opacity: 1 - out,
        transform: `translateY(${-150 * out}px)`,
        filter: `blur(${out * 8}px)`,
        textShadow: "0 6px 40px rgba(0,0,0,0.35)",
      }}
    >
      <SpringChars
        text={INTRO.eyebrow}
        frame={frame}
        at={TITLE_IN}
        stagger={0.7}
        style={{ fontFamily: FONTS.text, fontWeight: 700, fontSize: 46, letterSpacing: "0.08em", color: COLORS.point }}
      />
      <div style={{ height: 18 }} />
      <div style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 176, lineHeight: 1.05, color: COLORS.white }}>
        <SpringChars text={INTRO.titleAccent} frame={frame} at={TITLE_IN + 6} stagger={2} style={{ color: COLORS.point }} />
        <span style={{ display: "inline-block", width: 44 }} />
        <SpringChars text={INTRO.title} frame={frame} at={TITLE_IN + 14} stagger={2} />
      </div>
      <div
        style={{
          marginTop: 22,
          width: 280,
          height: 10,
          borderRadius: 5,
          background: COLORS.point,
          transform: `scaleX(${bar})`,
        }}
      />
      <div
        style={{
          marginTop: 30,
          fontFamily: FONTS.text,
          fontWeight: 600,
          fontSize: 40,
          letterSpacing: "0.24em",
          color: COLORS.white,
          opacity: 0.85 * bottom,
          transform: `translateY(${(1 - bottom) * 20}px)`,
        }}
      >
        {INTRO.bottom}
      </div>
    </AbsoluteFill>
  );
};

/** 영상 1이 들어올 빈 카드 자리 */
const EmptyCard: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < CARD_IN) return null;
  const s = pop(frame, CARD_IN, { damping: 18, stiffness: 190 });
  return (
    <Card
      style={{
        opacity: Math.min(1, s * 1.5),
        transform: `scale(${0.84 + 0.16 * s})`,
        background: "linear-gradient(160deg, rgba(255,255,255,0.10), rgba(8,27,35,0.75))",
      }}
    />
  );
};

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();

  // 0 속으로 줌: 지수적으로 커지며 빨려 들어감
  const z = prog(frame, ZOOM_START, ZOOM_END, easeIn);
  const scale = Math.exp(Math.log(46) * z);
  const blackOpacity = 1 - prog(frame, ZOOM_END - 3, ZOOM_END, easeInOut);

  return (
    <AbsoluteFill style={{ background: COLORS.black }}>
      {frame >= ZOOM_START - 1 && <World frame={frame} />}
      {blackOpacity > 0 && (
        <AbsoluteFill
          style={{
            opacity: blackOpacity,
            transform: `scale(${scale})`,
            transformOrigin: `${HOLE.cx}px ${HOLE.cy}px`,
          }}
        >
          {/* 검은 막: 0의 구멍 부분만 뚫려 있어서 뒤의 세계가 보인다 */}
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            <defs>
              <mask id="hole">
                <rect width={1920} height={1080} fill="white" />
                {frame >= ZOOM_START - 1 && (
                  <ellipse
                    cx={960 + (HOLE.cx - 960) * (1 + 0.07 * punchAt(frame))}
                    cy={NUM_CY + (HOLE.cy - NUM_CY) * (1 + 0.07 * punchAt(frame))}
                    rx={HOLE.rx * (1 + 0.07 * punchAt(frame))}
                    ry={HOLE.ry * (1 + 0.07 * punchAt(frame))}
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect width={1920} height={1080} fill={COLORS.black} mask="url(#hole)" />
          </svg>
          <Counter frame={frame} />
          <StopBurst frame={frame} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
