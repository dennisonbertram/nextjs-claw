import React from "react";
import { palette } from "../palette";

interface Props {
  size: number;
  running?: boolean;
  runningOpacity?: number;
}

export const InfiniteLogo: React.FC<Props> = ({
  size,
  running = false,
  runningOpacity = 1,
}) => {
  const radius = Math.round(size * 0.22);
  const fontSize = Math.round(size * 0.5);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: palette.accent,
        color: "#fff",
        fontSize,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      ∞
      {running && (
        <div
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            width: 8,
            height: 8,
            borderRadius: 999,
            background: palette.amber,
            opacity: runningOpacity,
          }}
        />
      )}
    </div>
  );
};
