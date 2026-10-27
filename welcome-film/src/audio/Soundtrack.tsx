import React from "react";
import { Audio, Easing, Sequence, interpolate, staticFile } from "remotion";
import { AUDIO, CLIPS, FPS, INTRO } from "../config";
import { sec } from "../lib/motion";
import { counterValue } from "../scenes/Intro";
import { BOUNDARIES, CLIP_STARTS } from "../timeline";

/** 피날레 트랙 시작 프레임 (영상 4 외침 직후) */
export const FINALE_FROM = CLIP_STARTS[CLIPS.length - 1] + AUDIO.finaleOffset;

/**
 * 음악 볼륨 커브 (덕킹). 말하는 구간에서는 musicDuck(약 -22dB)까지 내려간다.
 * 키프레임 사이는 sin 이징으로 이어진다.
 */
const musicKeys = (() => {
  const k: [number, number][] = [
    [0, AUDIO.musicFull],
    [INTRO.frames - 32, AUDIO.musicFull],
    [INTRO.frames - 2, AUDIO.musicDuck], // 영상 1의 첫 말 전에 덕킹 완료
  ];
  CLIPS.forEach((clip, i) => {
    if (!clip.breath) return;
    const [a, b] = clip.breath.map((s) => CLIP_STARTS[i] + sec(s));
    k.push([a, AUDIO.musicDuck], [a + 12, AUDIO.musicBreath], [b - 12, AUDIO.musicBreath], [b, AUDIO.musicDuck]);
  });
  // 영상 4의 외침이 끝나면 잔잔한 테마는 피날레 빌드업 아래로 사라진다
  k.push([FINALE_FROM, AUDIO.musicDuck], [FINALE_FROM + 40, 0]);
  return k;
})();

const musicVolume = (f: number) =>
  interpolate(
    f,
    musicKeys.map((x) => x[0]),
    musicKeys.map((x) => x[1]),
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) },
  );

/** 카운터 숫자가 바뀌는 프레임마다 틱 */
const tickFrames = (() => {
  const out: number[] = [];
  let prev = Math.floor(counterValue(0) + 1e-6);
  for (let f = 1; f < INTRO.frames; f++) {
    const n = Math.floor(counterValue(f) + 1e-6);
    if (n !== prev) out.push(f);
    prev = n;
  }
  return out;
})();

const Sfx: React.FC<{ at: number; file: string; volume: number }> = ({ at, file, volume }) => (
  <Sequence from={at} name={file}>
    <Audio src={staticFile(`audio/${file}`)} volume={volume} />
  </Sequence>
);

export const Soundtrack: React.FC = () => (
  <>
    <Audio src={staticFile(AUDIO.music)} volume={musicVolume} />
    {tickFrames.map((f) => (
      <Sfx key={f} at={f} file="sfx_tick.wav" volume={AUDIO.sfx.tick} />
    ))}
    <Sfx at={90} file="sfx_impact.wav" volume={AUDIO.sfx.impact} />
    <Sfx at={96} file="sfx_whoosh.wav" volume={AUDIO.sfx.whoosh} />
    <Sfx at={178} file="sfx_swoosh.wav" volume={AUDIO.sfx.swoosh} />
    {/* 영상 전환 스우시: 나가는 영상의 무음 꼬리에서 끝나도록 */}
    {BOUNDARIES.map((b) => (
      <Sfx key={b} at={b - Math.round(0.32 * FPS)} file="sfx_swoosh.wav" volume={AUDIO.sfx.swoosh} />
    ))}
    <Sfx at={CLIP_STARTS[CLIPS.length - 1] + sec(3.88)} file="sfx_sparkle.wav" volume={AUDIO.sfx.sparkle * 0.7} />
    {/* 피날레: 빌드업 → 엔드카드 첫 프레임에서 히트 */}
    <Sequence from={FINALE_FROM} name="피날레">
      <Audio src={staticFile(AUDIO.finale)} volume={AUDIO.finaleVolume} />
    </Sequence>
  </>
);
