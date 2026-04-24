import React from "react";
import { palette } from "../palette";
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: monoFont } = loadJetBrains("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

interface Props {
  panelWidth: number;
  showLiveDot?: boolean;
  children?: {
    preview?: React.ReactNode;
    panel?: React.ReactNode;
  };
}

// macOS-style window traffic lights — perfectly round, Safari chrome
const WindowChrome: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 16,
      bottom: 0,
      display: "flex",
      gap: 7,
      alignItems: "center",
      zIndex: 20,
    }}
  >
    {["#FF5F57", "#FEBC2E", "#28C840"].map((color, i) => (
      <div
        key={i}
        style={{
          width: 12,
          height: 12,
          borderRadius: 999,
          background: color,
          boxShadow: `inset 0 0 0 0.5px rgba(0,0,0,0.15)`,
          flexShrink: 0,
        }}
      />
    ))}
  </div>
);

export const AppShellFrame: React.FC<Props> = ({
  panelWidth,
  showLiveDot = false,
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
      {/* Preview area — macOS browser window frame */}
      <div
        style={{
          flex: 1,
          background: palette.previewBg,
          overflow: "hidden",
          position: "relative",
          borderRadius: 10,
          border: "1.5px solid rgba(0,0,0,0.14)",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06), 8px 0 32px rgba(0,0,0,0.06)",
          margin: "16px 0 16px 16px",
        }}
      >
        {/* macOS window chrome bar — Safari-style, cream-matched */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 40,
            background: "#f0eae0",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            zIndex: 10,
            borderRadius: "10px 10px 0 0",
          }}
        >
          <WindowChrome />
          {/* URL bar — centered, JetBrains Mono */}
          <div
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div
              style={{
                background: "rgba(0,0,0,0.05)",
                borderRadius: 6,
                padding: "4px 16px",
                fontSize: 12,
                color: palette.muted,
                fontFamily: monoFont,
                minWidth: 200,
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                gap: 6,
                justifyContent: "center",
              }}
            >
              {/* Live green dot when showLiveDot is true */}
              {showLiveDot && (
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: "#28C840",
                    flexShrink: 0,
                    boxShadow: "0 0 4px rgba(40,200,64,0.6)",
                  }}
                />
              )}
              localhost:3000
            </div>
          </div>
        </div>

        {/* Content shifted down for chrome bar */}
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: "hidden",
          }}
        >
          {children?.preview}
        </div>
      </div>

      {/* Chat panel (cream) — with left-edge depth shadow */}
      <div
        style={{
          width: panelWidth,
          minWidth: panelWidth,
          height: "100%",
          overflow: "hidden",
          background: palette.panel,
          borderLeft: "1px solid rgba(0,0,0,0.1)",
          boxShadow: "-12px 0px 36px rgba(0,0,0,0.08)",
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
