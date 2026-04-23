import React from "react";
import { palette } from "../palette";

interface Props {
  text?: string;
  typedChars?: number;
}

export const Composer: React.FC<Props> = ({ text = "", typedChars = 0 }) => {
  const displayed = text.slice(0, typedChars);

  return (
    <div
      style={{
        flexShrink: 0,
        padding: "8px 12px",
        borderTop: `1px solid ${palette.line}`,
      }}
    >
      <div
        style={{
          background: palette.bg,
          border: `1px solid ${palette.line}`,
          borderRadius: 8,
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          minHeight: 44,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: displayed ? palette.ink : palette.muted,
            fontFamily: "Inter, sans-serif",
            flex: 1,
          }}
        >
          {displayed || "Describe what to build..."}
        </span>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: palette.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
          >
            <path d="M6 2v8M2 6l4-4 4 4" />
          </svg>
        </div>
      </div>
    </div>
  );
};
