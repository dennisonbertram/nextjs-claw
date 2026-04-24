import React from "react";
import { palette } from "../palette";

interface Props {
  panelWidth: number;
  children?: {
    preview?: React.ReactNode;
    panel?: React.ReactNode;
  };
}

export const AppShellFrame: React.FC<Props> = ({
  panelWidth,
  children,
}) => {
  const totalWidth = 1920;

  return (
    <div
      style={{
        width: totalWidth,
        height: 1080,
        display: "flex",
        flexDirection: "row",
        overflow: "hidden",
        background: palette.bg,
      }}
    >
      {/* Preview area — wrapped in macOS-style window frame for depth */}
      <div
        style={{
          flex: 1,
          background: palette.previewBg,
          overflow: "hidden",
          position: "relative",
          borderRadius: 12,
          border: "1px solid #E5E5E5",
          boxShadow:
            "0 4px 20px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(0,0,0,0.04), 6px 0 24px rgba(0,0,0,0.04)",
          margin: "12px 0 12px 12px",
        }}
      >
        {children?.preview}
      </div>

      {/* Chat panel (cream) — matching left-edge detail for symmetry */}
      <div
        style={{
          width: panelWidth,
          minWidth: panelWidth,
          height: "100%",
          overflow: "hidden",
          background: palette.panel,
          borderLeft: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "-10px 0px 30px rgba(0,0,0,0.05)",
          flexShrink: 0,
          zIndex: 10,
          position: "relative",
        }}
      >
        {children?.panel}
      </div>
    </div>
  );
};
