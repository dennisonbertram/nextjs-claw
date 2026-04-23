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
      {/* Preview area (dark) */}
      <div
        style={{
          flex: 1,
          background: palette.previewBg,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {children?.preview}
      </div>

      {/* Chat panel (cream) */}
      <div
        style={{
          width: panelWidth,
          minWidth: panelWidth,
          height: "100%",
          overflow: "hidden",
          background: palette.panel,
          borderLeft: `1px solid ${palette.line}`,
          flexShrink: 0,
        }}
      >
        {children?.panel}
      </div>
    </div>
  );
};
