import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Bokeh, InkBackdrop, LightLeaks } from "../components/Atmosphere";
import { Card } from "../components/Card";
import { Captions } from "../components/Captions";
import { ClimaxType, Confetti } from "../components/Climax";
import { LowerThird } from "../components/LowerThird";
import { AUDIO, CLIPS, Clip, TRANSITION } from "../config";
import { clamp, easeIn, easeInOut, pop, prog, sec } from "../lib/motion";

const fill: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };

/**
 * 영상 1개 구간. 이 컴포넌트는 Series 안에서 정확히 clip.frames 동안만 존재하므로
 * 영상·음성은 항상 원본 첫 프레임부터 마지막 프레임까지 재생된다.
 */
export const ClipScene: React.FC<{ clip: Clip; index: number }> = ({ clip, index }) => {
  const frame = useCurrentFrame();
  const last = clip.frames - 1;
  const isFirst = index === 0;
  const isLast = index === CLIPS.length - 1;

  // ── 카드 전환 (화면만 움직임, 오디오와 무관) ──
  let tx = 0;
  let rot = 0;
  let scale = 1;
  let ty = Math.sin(frame / 42 + index * 2) * 3; // 아주 미세한 부유
  let cardOpacity = 1;
  let bright = 1;

  if (!isFirst) {
    const s = pop(frame, -2, { damping: 20, stiffness: 210 });
    tx += 1850 * (1 - s);
    rot += 5 * (1 - s);
  }
  if (!isLast) {
    const e = prog(frame, last - TRANSITION.exit + 1, last, easeIn);
    tx -= 1500 * e; // 마지막 프레임에도 왼쪽 끝에 걸쳐 있어 매 프레임 카드가 보임
    rot -= 5 * e;
    scale -= 0.06 * e;
  }

  // ── 영상 4: 손 흔드는 꼬리에서 카드가 물러났다가 빛에 녹아듦 ──
  let bgOpacity = 1;
  if (clip.climax) {
    const pull = prog(frame, sec(3.95), sec(5.8), easeInOut);
    const melt = prog(frame, sec(5.8), last, easeIn);
    scale *= 1 - 0.18 * pull + 0.06 * melt;
    ty += -56 * pull;
    bright = 1 + 1.4 * melt;
    cardOpacity = 1 - melt;
    bgOpacity = 1 - pull;
  }

  // 인트로에서 넘어올 때: 빈 카드 안에서 영상이 밝아짐 (이미 재생 중)
  const videoIn = isFirst ? prog(frame, 0, 6) : 1;

  const kb = interpolate(frame, [0, last], [1, clip.kenBurns], { ...clamp, easing: easeInOut });

  return (
    <AbsoluteFill>
      <InkBackdrop />
      {/* 배경: 같은 영상을 크게 흐려서 */}
      <AbsoluteFill style={{ opacity: bgOpacity }}>
        <OffthreadVideo
          src={staticFile(clip.bg)}
          muted
          style={{ ...fill, transform: "scale(1.18)", filter: "brightness(0.5) saturate(1.15)" }}
        />
        <AbsoluteFill style={{ background: "rgba(16,48,61,0.42)" }} />
      </AbsoluteFill>
      <LightLeaks intensity={0.75} seed={index + 1} />
      <Bokeh count={12} opacity={0.6} />

      <Card
        style={{
          opacity: cardOpacity,
          transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${scale})`,
          filter: bright !== 1 ? `brightness(${bright})` : undefined,
        }}
      >
        <div style={{ ...fill, opacity: videoIn, transform: `scale(${kb})`, transformOrigin: "50% 35%" }}>
          <OffthreadVideo src={staticFile(clip.src)} muted style={fill} />
        </div>
      </Card>

      {clip.climax && (
        <AbsoluteFill
          style={{
            background: "radial-gradient(circle at 50% 42%, rgba(255,250,232,0.95), rgba(255,214,150,0.55) 38%, rgba(255,180,100,0) 75%)",
            opacity: prog(frame, sec(5.6), last, easeIn),
          }}
        />
      )}

      <LowerThird index={index} total={CLIPS.length} role={clip.role} />
      {clip.climax ? <ClimaxType cue={clip.cues[0]} /> : <Captions cues={clip.cues} />}
      {clip.climax && <Confetti at={sec(3.88)} />}

      <Audio src={staticFile(clip.voice)} volume={AUDIO.voice} />
    </AbsoluteFill>
  );
};
