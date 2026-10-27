import React from "react";
import { Composition } from "remotion";
import { FPS, HEIGHT, WIDTH } from "./config";
import { Homecoming } from "./Homecoming";
import { TOTAL_FRAMES } from "./timeline";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Homecoming"
    component={Homecoming}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
