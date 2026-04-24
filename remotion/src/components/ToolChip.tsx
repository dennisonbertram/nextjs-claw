import React from "react";
import { palette } from "../palette";

export type ToolState = "running" | "ok" | "err";

interface Props {
  name: string;
  target?: string;
  state: ToolState;
  pulseOpacity?: number;
  pulseScale?: number;
}

export const ToolChip: React.FC<Props> = ({
  name,
  target,
  state,
  pulseOpacity = 1,
  pulseScale = 1,
}) => {
  const stateColor =
    state === "running"
      ? palette.accent
      : state === "ok"
      ? palette.ok
      : palette.err;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: palette.subtle,
        border: `1px solid ${palette.line}`,
        borderLeft: `3px solid ${stateColor}`,
        padding: "8px 14px 8px 10px",
        borderRadius: 5,
        fontSize: 16,
        fontFamily: "'JetBrains Mono', 'Courier New', ui-monospace, monospace",
        width: "fit-content",
        maxWidth: "100%",
      }}
    >
      <span style={{ color: stateColor, fontWeight: 600 }}>{name}</span>
      {target && (
        <span
          style={{
            color: palette.ink,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 260,
          }}
        >
          {target}
        </span>
      )}
      {state === "running" && (
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: 999,
            background: palette.accent,
            opacity: pulseOpacity,
            transform: `scale(${pulseScale})`,
            transformOrigin: "center center",
            flexShrink: 0,
          }}
        />
      )}
      {state === "ok" && (
        <span style={{ color: palette.ok, fontSize: 14 }}>✓</span>
      )}
      {state === "err" && (
        <span style={{ color: palette.err, fontSize: 14 }}>✕</span>
      )}
    </div>
  );
};
