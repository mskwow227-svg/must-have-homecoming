import { CLIPS, ENDCARD, INTRO } from "./config";

/** 영상 4개를 프레임 단위로 빈틈없이 이어 붙인 절대 위치 */
export const CLIP_STARTS: number[] = CLIPS.reduce<number[]>((acc, clip, i) => {
  acc.push(i === 0 ? INTRO.frames : acc[i - 1] + CLIPS[i - 1].frames);
  return acc;
}, []);

export const VIDEO_FRAMES = CLIPS.reduce((sum, c) => sum + c.frames, 0);
export const ENDCARD_START = INTRO.frames + VIDEO_FRAMES;
export const TOTAL_FRAMES = ENDCARD_START + ENDCARD.frames;

/** 영상 경계 (다음 영상 첫 프레임의 절대 위치) */
export const BOUNDARIES = CLIP_STARTS.slice(1);
