import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import { FONTS } from "./config";

const faces: { family: string; file: string; weight: string }[] = [
  { family: FONTS.display, file: "fonts/Paperlogy-8ExtraBold.ttf", weight: "800" },
  { family: FONTS.display, file: "fonts/Paperlogy-9Black.ttf", weight: "900" },
  { family: FONTS.text, file: "fonts/Pretendard-SemiBold.otf", weight: "600" },
  { family: FONTS.text, file: "fonts/Pretendard-Bold.otf", weight: "700" },
  { family: FONTS.text, file: "fonts/Pretendard-ExtraBold.otf", weight: "800" },
];

export const fontsReady = Promise.all(
  faces.map((f) => loadFont({ family: f.family, url: staticFile(f.file), weight: f.weight })),
);
