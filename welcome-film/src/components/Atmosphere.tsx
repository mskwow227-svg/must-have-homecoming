import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS } from "../config";

/** 필름 그레인: 프레임마다 시드가 바뀌는 노이즈 */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.07 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <filter id={`grain-${frame % 8}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 8} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${frame % 8})`} />
      </svg>
    </AbsoluteFill>
  );
};

/** 은은한 라이트 리크: 화면 가장자리에서 천천히 흐르는 따뜻한 빛 */
export const LightLeaks: React.FC<{ intensity?: number; seed?: number }> = ({ intensity = 1, seed = 0 }) => {
  const frame = useCurrentFrame();
  const t = (frame + seed * 97) / 30;
  const blobs = [
    { x: 8 + 6 * Math.sin(t * 0.21), y: 14 + 8 * Math.cos(t * 0.17), r: 46, c: "255,196,92", a: 0.42 },
    { x: 94 + 5 * Math.cos(t * 0.19), y: 82 + 7 * Math.sin(t * 0.23), r: 52, c: "255,225,77", a: 0.3 },
    { x: 78 + 9 * Math.sin(t * 0.13 + 1), y: 6 + 5 * Math.cos(t * 0.29), r: 34, c: "255,140,90", a: 0.22 },
  ];
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", opacity: intensity, pointerEvents: "none" }}>
      {blobs.map((b, i) => (
        <AbsoluteFill
          key={i}
          style={{
            background: `radial-gradient(circle at ${b.x}% ${b.y}%, rgba(${b.c},${b.a}) 0%, rgba(${b.c},0) ${b.r}%)`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 52%, rgba(0,0,0,${strength}) 100%)`,
      pointerEvents: "none",
    }}
  />
);

/** 메인 색 배경 (인트로 이후·엔드카드) */
export const InkBackdrop: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at 50% 40%, ${COLORS.main} 0%, ${COLORS.mainDeep} 78%)`,
    }}
  />
);

/** 천천히 떠다니는 보케 입자 */
export const Bokeh: React.FC<{ count?: number; opacity?: number }> = ({ count = 18, opacity = 1 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none", mixBlendMode: "screen" }}>
      {new Array(count).fill(0).map((_, i) => {
        const s1 = Math.sin(i * 91.7) * 0.5 + 0.5;
        const s2 = Math.sin(i * 37.3 + 2) * 0.5 + 0.5;
        const size = 20 + s1 * 90;
        // 선형 이동 없이 사인 곡선으로만 부유
        const x = s2 * 1920 + Math.sin(frame / (80 + s1 * 60) + i) * 40;
        const y = s1 * 1080 + Math.cos(frame / (100 + s2 * 70) + i * 1.7) * 60;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: i % 3 === 0 ? "rgba(255,225,77,0.16)" : "rgba(255,255,255,0.08)",
              filter: `blur(${4 + s2 * 8}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
