import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
  AbsoluteFill,
  Img,
  staticFile,
} from "remotion";
import { palette } from "../palette";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: interFont } = loadInter("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const { fontFamily: monoFont } = loadJetBrains("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

// Scene 5: SnapShowcase — 90 frames (3s)
// default(420) → wide(620) at frame 15  hold 15f
// wide(620) → rail(56) at frame 30      hold 20f
// rail(56) → default(420) at frame 50  hold 40f
// Elastic spring for each transition

interface SnapTransitionProps {
  from: number;
  to: number;
  startFrame: number;
  currentFrame: number;
  fps: number;
}

function getSnapWidth({
  from,
  to,
  startFrame,
  currentFrame,
  fps,
}: SnapTransitionProps): number {
  const springVal = spring({
    frame: currentFrame - startFrame,
    fps,
    from,
    to,
    config: { damping: 10, stiffness: 140, mass: 0.8 },
    durationInFrames: 16,
  });
  return springVal;
}

const RailPanel: React.FC = () => (
  <div
    style={{
      width: "100%",
      height: "100%",
      background: palette.panel,
      borderLeft: `1px solid ${palette.line}`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingTop: 14,
      gap: 16,
    }}
  >
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 7,
        background: palette.accent,
        color: "#fff",
        fontSize: 16,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: interFont,
      }}
    >
      ∞
    </div>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        style={{
          width: 22,
          height: 22,
          borderRadius: 4,
          background: palette.subtle,
          border: `1px solid ${palette.line}`,
        }}
      />
    ))}
  </div>
);

const FullPanel: React.FC = () => (
  <div
    style={{
      width: "100%",
      height: "100%",
      background: palette.panel,
      borderLeft: `1px solid ${palette.line}`,
      display: "flex",
      flexDirection: "column",
    }}
  >
    <header
      style={{
        flexShrink: 0,
        padding: "14px 16px 0",
        borderBottom: `1px solid ${palette.line}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            background: palette.accent,
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: interFont,
          }}
        >
          ∞
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: palette.ink, fontFamily: interFont }}>
            the infinite app
          </div>
          <div style={{ fontSize: 10, color: palette.muted, fontFamily: monoFont, marginTop: 1 }}>
            claude-opus-4-7 · idle
          </div>
        </div>
      </div>
    </header>
    <div style={{ flex: 1, padding: "12px 16px" }}>
      <div
        style={{
          background: palette.subtle,
          borderRadius: 6,
          border: `1px solid ${palette.line}`,
          padding: "8px 10px",
          fontSize: 12,
          color: palette.muted,
          fontFamily: interFont,
        }}
      >
        Wrote the landing page — hero, features, pricing.
      </div>
    </div>
  </div>
);

export const SnapShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Width transitions with elastic spring
  // 0-15: hold default (420)
  // 15-30: spring to wide (620)
  // 30-50: hold wide
  // 50-65: spring to rail (56)
  // 65-75: hold rail
  // 75-90: spring to default (420)

  let panelWidth: number;

  if (frame < 15) {
    panelWidth = 420;
  } else if (frame < 30) {
    panelWidth = getSnapWidth({ from: 420, to: 620, startFrame: 15, currentFrame: frame, fps });
  } else if (frame < 50) {
    panelWidth = 620;
  } else if (frame < 65) {
    panelWidth = getSnapWidth({ from: 620, to: 56, startFrame: 50, currentFrame: frame, fps });
  } else if (frame < 75) {
    panelWidth = 56;
  } else {
    panelWidth = getSnapWidth({ from: 56, to: 420, startFrame: 75, currentFrame: frame, fps });
  }

  // Preview scale: subtle boost at rail (near full width)
  const previewScale = interpolate(
    panelWidth,
    [56, 420, 620],
    [1.012, 1.0, 0.996],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Snap label
  let snapLabel = "420 · default";
  if (panelWidth > 500) snapLabel = `${Math.round(panelWidth)} · wide`;
  else if (panelWidth < 100) snapLabel = `${Math.round(panelWidth)} · rail`;
  else if (frame >= 75) snapLabel = `${Math.round(panelWidth)} · default`;

  const labelOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isRail = panelWidth < 100;

  // Background slow motion
  const bgRotation = interpolate(frame, [0, 90], [0, 6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `conic-gradient(from ${bgRotation}deg at 60% 40%, ${palette.bg} 0%, #ede8dc 50%, ${palette.bg} 100%)`,
      }}
    >
      <div
        style={{
          width: 1920,
          height: 1080,
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Preview area */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              transform: `scale(${previewScale})`,
              transformOrigin: "center center",
            }}
          >
            <Img
              src={staticFile("saas-landing-light.png")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "top",
              }}
            />
          </div>

          {/* Snap label overlay */}
          <div
            style={{
              position: "absolute",
              top: 24,
              left: 0,
              right: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              opacity: labelOpacity,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: palette.ink,
                fontFamily: interFont,
                background: "rgba(244,240,232,0.9)",
                padding: "4px 14px",
                borderRadius: 6,
                border: `1px solid ${palette.line}`,
              }}
            >
              Snap states
            </div>
            <div
              style={{
                fontSize: 12,
                color: palette.muted,
                fontFamily: monoFont,
                background: "rgba(244,240,232,0.85)",
                padding: "2px 10px",
                borderRadius: 4,
                border: `1px solid ${palette.line}`,
              }}
            >
              {snapLabel}
            </div>
          </div>
        </div>

        {/* Chat panel — animating width */}
        <div
          style={{
            width: panelWidth,
            minWidth: panelWidth,
            height: "100%",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {isRail ? <RailPanel /> : <FullPanel />}
        </div>
      </div>
    </AbsoluteFill>
  );
};
