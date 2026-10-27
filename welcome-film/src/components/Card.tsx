import React from "react";
import { LAYOUT } from "../config";

const { card } = LAYOUT;
export const CARD_LEFT = card.cx - card.width / 2;
export const CARD_TOP = card.cy - card.height / 2;

/** 영상이 들어가는 둥근 카드. transform은 바깥에서 받는다. */
export const Card: React.FC<{
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ style, children }) => (
  <div
    style={{
      position: "absolute",
      left: CARD_LEFT,
      top: CARD_TOP,
      width: card.width,
      height: card.height,
      borderRadius: card.radius,
      overflow: "hidden",
      background: "rgba(8,27,35,0.55)",
      boxShadow: "0 40px 120px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.35)",
      ...style,
    }}
  >
    {children}
    {/* 얇은 하이라이트 테두리 */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: card.radius,
        boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.16), inset 0 2px 0 rgba(255,255,255,0.22)",
        pointerEvents: "none",
      }}
    />
  </div>
);
