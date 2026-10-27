import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Soundtrack } from "./audio/Soundtrack";
import { Grain, Vignette } from "./components/Atmosphere";
import { COLORS, ENDCARD, INTRO } from "./config";
import "./fonts";
import { EndCard } from "./scenes/EndCard";
import { Intro } from "./scenes/Intro";
import { VideoSection } from "./scenes/VideoSection";
import { ENDCARD_START, VIDEO_FRAMES } from "./timeline";

export const Homecoming: React.FC = () => (
  <AbsoluteFill style={{ background: COLORS.black }}>
    <Sequence durationInFrames={INTRO.frames} name="인트로">
      <Intro />
    </Sequence>
    <Sequence from={INTRO.frames} durationInFrames={VIDEO_FRAMES} name="영상 4개">
      <VideoSection />
    </Sequence>
    <Sequence from={ENDCARD_START} durationInFrames={ENDCARD.frames} name="엔드카드">
      <EndCard />
    </Sequence>
    <Vignette />
    <Grain />
    <Soundtrack />
  </AbsoluteFill>
);
