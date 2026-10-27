import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Bokeh, InkBackdrop, LightLeaks } from "../components/Atmosphere";
import { Confetti } from "../components/Climax";
import { AUDIO, COLORS, ENDCARD, FONTS, FPS } from "../config";
import { easeOut, pop, prog, sec } from "../lib/motion";

export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  // 영상 4가 녹아든 빛에서 이어지는 플래시
  const glow = 1 - prog(frame, 0, 16, easeOut);
  const sub = pop(frame, sec(0.75), { damping: 18, stiffness: 140 });
  const line = prog(frame, sec(1.25), sec(1.25) + 16, easeOut);
  const date = pop(frame, sec(1.4), { damping: 18, stiffness: 140 });
  const logos = pop(frame, sec(2.0), { damping: 18, stiffness: 120 });

  // 피날레 음악 비트 연동: 0박 = 첫 히트, 8박 = 마지막 빅 히트
  const beatFrames = (60 / AUDIO.bpm) * FPS;
  const finalHit = Math.round(8 * beatFrames);
  const sinceBeat = frame < finalHit ? frame % beatFrames : frame - finalHit;
  const beat = Math.exp(-sinceBeat / 3.2); // 킥마다 튀었다가 빠르게 감쇠
  const bigFlash = frame >= finalHit ? Math.exp(-(frame - finalHit) / 5) : 0;
  const copyPulse = 1 + 0.018 * beat + 0.05 * bigFlash;

  let charIndex = 0;
  return (
    <AbsoluteFill>
      <InkBackdrop />
      <LightLeaks intensity={1} seed={9} />
      <Bokeh count={20} opacity={0.9} />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 42%, rgba(255,250,232,0.95), rgba(255,214,150,0.55) 38%, rgba(255,180,100,0) 75%)",
          opacity: glow,
        }}
      />

      {/* 킥마다 맥동하는 빛 */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 50% 40%, rgba(255,225,77,0.5), rgba(255,225,77,0) 62%)",
          opacity: 0.32 * beat + 0.5 * bigFlash,
          mixBlendMode: "screen",
        }}
      />
      <Confetti at={0} count={110} />
      <Confetti at={finalHit} count={130} />

      <AbsoluteFill
        style={{
          alignItems: "center",
          paddingTop: 196,
          flexDirection: "column",
          transform: `scale(${copyPulse})`,
          transformOrigin: "50% 34%",
        }}
      >
        {ENDCARD.copy.map((ln, li) => (
          <div
            key={li}
            style={{
              fontFamily: FONTS.display,
              fontWeight: 900,
              fontSize: li === 0 ? 104 : 168,
              lineHeight: li === 0 ? 1.1 : 1.08,
              color: ln.accent ? COLORS.point : COLORS.white,
              textShadow: "0 10px 50px rgba(0,0,0,0.35)",
              display: "flex",
            }}
          >
            {Array.from(ln.text).map((ch) => {
              const s = pop(frame, 2 + charIndex++ * 2.2, { damping: 12, stiffness: 150 });
              return (
                <span
                  key={charIndex}
                  style={{
                    display: "inline-block",
                    whiteSpace: "pre",
                    opacity: Math.min(1, s * 1.4),
                    transform: `translateY(${(1 - s) * 70}px) scale(${0.8 + 0.2 * s})`,
                    filter: `blur(${Math.max(0, (1 - s) * 10)}px)`,
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </div>
        ))}

        <div
          style={{
            marginTop: 34,
            fontFamily: FONTS.text,
            fontWeight: 600,
            fontSize: 42,
            color: COLORS.white,
            opacity: 0.88 * Math.min(1, sub * 1.3),
            transform: `translateY(${(1 - sub) * 24}px)`,
          }}
        >
          {ENDCARD.sub}
        </div>

        <div style={{ marginTop: 44, display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ width: 120, height: 3, background: COLORS.point, transform: `scaleX(${line})`, transformOrigin: "100% 50%" }} />
          <div
            style={{
              fontFamily: FONTS.text,
              fontWeight: 700,
              fontSize: 38,
              letterSpacing: "0.22em",
              color: COLORS.point,
              opacity: Math.min(1, date * 1.3),
              transform: `translateY(${(1 - date) * 16}px)`,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {ENDCARD.date}
          </div>
          <div style={{ width: 120, height: 3, background: COLORS.point, transform: `scaleX(${line})`, transformOrigin: "0% 50%" }} />
        </div>
      </AbsoluteFill>

      {/* 로고: 원본 색을 살리기 위해 흰 바 위에 */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 70 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 52,
            padding: "22px 56px",
            borderRadius: 999,
            background: COLORS.white,
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            opacity: Math.min(1, logos * 1.3),
            transform: `translateY(${(1 - logos) * 30}px)`,
          }}
        >
          {ENDCARD.logos.map((src, i) => (
            <React.Fragment key={src}>
              {i > 0 && <div style={{ width: 2, height: 60, background: "rgba(16,48,61,0.18)" }} />}
              <Img src={staticFile(src)} style={{ height: 92 }} />
            </React.Fragment>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
