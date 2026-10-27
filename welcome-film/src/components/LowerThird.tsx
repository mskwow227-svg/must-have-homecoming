import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS, FONTS, LOWER_THIRD } from "../config";
import { easeIn, easeOut, prog, sec } from "../lib/motion";
import { CARD_LEFT, CARD_TOP } from "./Card";

/** 영상 시작 0.3~3.5초: 카드 좌상단 안쪽에 이름·역할 표시 */
export const LowerThird: React.FC<{ index: number; total: number; role: string }> = ({ index, total, role }) => {
  const frame = useCurrentFrame();
  if (!LOWER_THIRD.enabled) return null;
  const IN = sec(0.3);
  const OUT = sec(3.5);
  const bar = prog(frame, IN, IN + 8, easeOut) * (1 - prog(frame, OUT + 6, OUT + 12, easeIn));
  const text = prog(frame, IN + 4, IN + 18, easeOut) * (1 - prog(frame, OUT, OUT + 9, easeIn));
  if (bar <= 0 && text <= 0) return null;
  return (
    <div style={{ position: "absolute", left: CARD_LEFT + 44, top: CARD_TOP + 44, display: "flex", alignItems: "stretch" }}>
      <div
        style={{
          width: 7,
          borderRadius: 4,
          background: COLORS.point,
          transform: `scaleY(${bar})`,
          transformOrigin: "50% 0%",
          boxShadow: "0 0 18px rgba(255,225,77,0.55)",
        }}
      />
      <div style={{ overflow: "hidden", marginLeft: 14 }}>
        <div
          style={{
            transform: `translateX(${(text - 1) * 105}%)`,
            padding: "14px 26px 16px",
            borderRadius: 12,
            background: "rgba(8,27,35,0.62)",
          }}
        >
          {LOWER_THIRD.showIndex && (
            <div
              style={{
                fontFamily: FONTS.text,
                fontWeight: 700,
                fontSize: 26,
                letterSpacing: "0.2em",
                color: COLORS.point,
              }}
            >
              {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </div>
          )}
          <div style={{ fontFamily: FONTS.text, fontWeight: 800, fontSize: 44, color: COLORS.white, whiteSpace: "nowrap" }}>
            {role}
          </div>
        </div>
      </div>
    </div>
  );
};
