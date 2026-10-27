import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS, Cue, FONTS, FPS, LAYOUT, Word } from "../config";
import { easeIn, easeOut, pop, prog } from "../lib/motion";

const LEAD = 0.12; // 자막 줄은 말보다 0.12초 먼저 뜬다
const TAIL = 0.25; // 말이 끝난 뒤 머무는 시간

const splitLines = (words: Word[]) =>
  words.reduce<Word[][]>((lines, w) => {
    if (w.br || lines.length === 0) lines.push([]);
    lines[lines.length - 1].push(w);
    return lines;
  }, []);

const WordSpan: React.FC<{ w: Word; frame: number; first: boolean }> = ({ w, frame, first }) => {
  const at = w.t * FPS - 2;
  const lit = prog(frame, at, at + 4, easeOut);
  // 핵심 단어: 튀어 올랐다가 제자리로 (최종 크기는 1)
  const bump = w.key ? Math.sin(Math.min(1, pop(frame, at, { damping: 12, stiffness: 160 })) * Math.PI) : 0;
  return (
    <span
      style={{
        display: "inline-block",
        marginLeft: first || w.join ? 0 : "0.3em",
        opacity: 0.38 + 0.62 * lit,
        color: w.key && lit > 0 ? COLORS.point : COLORS.white,
        transform: w.key ? `translateY(${-12 * bump}px) scale(${1 + 0.12 * bump})` : undefined,
        transformOrigin: "50% 80%",
      }}
    >
      {w.text}
    </span>
  );
};

/** 문장 단위 키네틱 자막: 줄은 문장마다, 단어는 말하는 순간에 밝아진다 */
export const Captions: React.FC<{ cues: Cue[] }> = ({ cues }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {cues.map((cue, i) => {
        const next = cues[i + 1];
        const inAt = (cue.start - LEAD) * FPS;
        const outEnd = Math.min((cue.end + TAIL) * FPS, next ? (next.start - LEAD) * FPS : Infinity);
        if (frame < inAt - 1 || frame > outEnd) return null;
        const enter = pop(frame, inAt, { damping: 18, stiffness: 200 });
        const exit = prog(frame, outEnd - 5, outEnd, easeIn);
        const size = cue.big ? LAYOUT.captionBigSize : LAYOUT.captionSize;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: LAYOUT.captionBottom,
              display: "flex",
              justifyContent: "center",
              opacity: Math.min(1, enter * 1.3) * (1 - exit),
              transform: `translateY(${(1 - enter) * 26 - exit * 14}px)`,
            }}
          >
            <div
              style={{
                padding: cue.big ? "18px 52px 22px" : "16px 44px 20px",
                borderRadius: 30,
                background: "rgba(16,48,61,0.74)",
                boxShadow: "0 18px 50px rgba(0,0,0,0.35), inset 0 0 0 1.5px rgba(255,255,255,0.10)",
                fontFamily: FONTS.text,
                fontWeight: cue.big ? 800 : 700,
                fontSize: size,
                lineHeight: 1.32,
                letterSpacing: "-0.01em",
                textAlign: "center",
                color: COLORS.white,
                maxWidth: 1640,
              }}
            >
              {splitLines(cue.words).map((line, li) => (
                <div key={li} style={{ whiteSpace: "nowrap" }}>
                  {line.map((w, wi) => (
                    <WordSpan key={wi} w={w} frame={frame} first={wi === 0} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
};
