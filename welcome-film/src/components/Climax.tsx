import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS, Cue, FONTS, FPS } from "../config";
import { easeIn, pop, prog, rand, sec } from "../lib/motion";

/** 영상 4: 함께 외치는 "다시 한 번 / 진심으로 환영합니다!" 대형 키네틱 타이포 */
export const ClimaxType: React.FC<{ cue: Cue }> = ({ cue }) => {
  const frame = useCurrentFrame();
  const out = prog(frame, cue.end * FPS - 8, cue.end * FPS, easeIn);
  const scrim = prog(frame, -2, 8) * (1 - out);
  const lines: { w: (typeof cue.words)[number]; i: number }[][] = [[]];
  cue.words.forEach((w, i) => {
    if (w.br) lines.push([]);
    lines[lines.length - 1].push({ w, i });
  });
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: "linear-gradient(180deg, rgba(8,27,35,0) 52%, rgba(8,27,35,0.82) 100%)",
          opacity: scrim,
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 58,
          opacity: 1 - out,
          transform: `translateY(${-40 * out}px)`,
        }}
      >
        {lines.map((line, li) => (
          <div
            key={li}
            style={{
              display: "flex",
              gap: li === 0 ? 26 : 40,
              fontFamily: li === 0 ? FONTS.text : FONTS.display,
              fontWeight: li === 0 ? 800 : 900,
              fontSize: li === 0 ? 74 : 148,
              lineHeight: li === 0 ? 1.15 : 1.02,
              color: li === 0 ? COLORS.white : COLORS.point,
              textShadow: "0 10px 50px rgba(0,0,0,0.45)",
            }}
          >
            {line.map(({ w, i }) => {
              const s = pop(frame, w.t * FPS - 2, { damping: 10, stiffness: 190 });
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    opacity: Math.min(1, s * 2),
                    transform: `translateY(${(1 - s) * 90}px) scale(${0.55 + 0.45 * s}) rotate(${(1 - s) * (i % 2 ? 6 : -6)}deg)`,
                    filter: `blur(${Math.max(0, (1 - s) * 12)}px)`,
                  }}
                >
                  {w.text}
                </span>
              );
            })}
          </div>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** 손 흔드는 꼬리 구간의 컨페티 (포물선 운동, 결정적 난수) */
export const Confetti: React.FC<{ at: number; count?: number }> = ({ at, count = 90 }) => {
  const frame = useCurrentFrame();
  const t = (frame - at) / FPS;
  if (t < 0 || t > 3) return null;
  const fade = 1 - prog(frame, at + sec(1.6), at + sec(2.4));
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: fade }}>
      {new Array(count).fill(0).map((_, i) => {
        const side = i % 3; // 왼쪽 아래, 오른쪽 아래, 가운데 아래
        const x0 = side === 0 ? 180 : side === 1 ? 1740 : 960;
        const dir = side === 0 ? 1 : side === 1 ? -1 : rand(i) > 0.5 ? 1 : -1;
        const vx = dir * (150 + rand(i * 3) * 650);
        const vy = -(900 + rand(i * 7) * 750);
        const g = 1150;
        const drag = 1.6; // 공기 저항: 옆으로 퍼지다 점점 느려짐
        const x = x0 + (vx * (1 - Math.exp(-drag * t))) / drag;
        const y = 1120 + vy * t + 0.5 * g * t * t;
        const rot = (rand(i * 11) - 0.5) * 1440 * t;
        const flip = Math.abs(Math.cos(t * (6 + rand(i * 13) * 8)));
        const w = 12 + rand(i * 5) * 14;
        const color = i % 4 === 0 ? COLORS.white : i % 4 === 1 ? "#FFF3A6" : COLORS.point;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: w,
              height: w * 0.45,
              borderRadius: 2,
              background: color,
              transform: `rotate(${rot}deg) scaleY(${0.2 + 0.8 * flip})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
