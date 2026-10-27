import { Easing, interpolate, spring } from "remotion";
import { FPS } from "../config";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

/** 구간 [from, to] 프레임을 0→1로, 이징 적용 */
export const prog = (frame: number, from: number, to: number, easing = easeInOut) =>
  interpolate(frame, [from, to], [0, 1], { ...clamp, easing });

/** 프레임 위치에서 시작하는 spring (0→1) */
export const pop = (
  frame: number,
  at: number,
  config: { damping?: number; stiffness?: number; mass?: number } = {},
) =>
  spring({
    frame: frame - at,
    fps: FPS,
    config: { damping: 14, stiffness: 170, mass: 0.9, ...config },
  });

export const sec = (s: number) => Math.round(s * FPS);

/** 결정적 의사난수 (렌더마다 같은 결과) */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
