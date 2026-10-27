import React from "react";
import { AbsoluteFill, Series, useCurrentFrame } from "remotion";
import { CLIPS, INTRO } from "../config";
import { easeInOut, prog } from "../lib/motion";
import { BOUNDARIES } from "../timeline";
import { ClipScene } from "./ClipScene";

/** 경계에서 화면을 가로지르는 빛 (배경이 바뀌는 순간을 부드럽게 가림) */
const LightSweep: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const p = prog(frame, at - 7, at + 10, easeInOut);
  if (p <= 0 || p >= 1) return null;
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", pointerEvents: "none", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: -400,
          left: -900 + 3700 * p,
          width: 700,
          height: 1900,
          transform: "rotate(18deg)",
          background:
            "linear-gradient(90deg, rgba(255,225,77,0) 0%, rgba(255,236,160,0.28) 45%, rgba(255,255,255,0.32) 50%, rgba(255,236,160,0.28) 55%, rgba(255,225,77,0) 100%)",
          filter: "blur(30px)",
        }}
      />
    </AbsoluteFill>
  );
};

/** 영상 4개를 Series로 프레임 공백 없이 이어 붙인다 */
export const VideoSection: React.FC = () => (
  <AbsoluteFill>
    <Series>
      {CLIPS.map((clip, i) => (
        <Series.Sequence key={clip.id} durationInFrames={clip.frames} premountFor={30} name={`영상 ${clip.id}`}>
          <ClipScene clip={clip} index={i} />
        </Series.Sequence>
      ))}
    </Series>
    {BOUNDARIES.map((b) => (
      <LightSweep key={b} at={b - INTRO.frames} />
    ))}
  </AbsoluteFill>
);
