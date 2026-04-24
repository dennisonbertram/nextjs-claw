import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
  Img,
  staticFile,
} from "remotion";
import { palette } from "../palette";
import { Grain } from "../components/Grain";
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

// Scene 5: Result Showcase — 90 frames (3s)
// The "look what we built" payoff moment
// Left: Ghost landing with macOS window frame, gentle vertical scroll animation
// Right: Claude's summary text fades in with good breathing room
// No snap states — focus is the payoff

const SUMMARY_LINES = [
  "Built your SaaS landing page.",
  "• Hero with gradient headline",
  "• Feature grid, 3-col",
  "• Pricing section, 3 tiers",
  "• CTA footer",
];

export const SnapShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background slow rotation
  const bgRotation = interpolate(frame, [0, 90], [0, 6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Left panel: gentle vertical scroll — translateY 0 → -300 over 70 frames
  // Image is absolutely positioned, container has overflow:hidden — translateY moves it up
  const scrollY = interpolate(frame, [5, 70], [0, -320], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Panel slides in from right
  const panelSpring = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    config: { damping: 20, stiffness: 140 },
    durationInFrames: 20,
  });
  const panelX = interpolate(panelSpring, [0, 1], [60, 0]);
  const panelOpacity = interpolate(frame, [0, 10], [0, 1], {
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
        {/* Preview area — Ghost landing with macOS window chrome */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            position: "relative",
            borderRadius: 10,
            border: "1.5px solid rgba(0,0,0,0.14)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06), 8px 0 32px rgba(0,0,0,0.06)",
            margin: "16px 0 16px 16px",
          }}
        >
          {/* macOS window chrome bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 38,
              background: "rgba(248,246,242,0.97)",
              borderBottom: "1px solid rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              zIndex: 20,
              borderRadius: "10px 10px 0 0",
            }}
          >
            {/* Traffic lights */}
            <div style={{ display: "flex", gap: 7, paddingLeft: 16 }}>
              {["#FF5F57", "#FEBC2E", "#28C840"].map((color, i) => (
                <div
                  key={i}
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: 999,
                    background: color,
                    boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.15)",
                  }}
                />
              ))}
            </div>
            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  background: "rgba(0,0,0,0.05)",
                  borderRadius: 6,
                  padding: "4px 20px",
                  fontSize: 12,
                  color: palette.muted,
                  fontFamily: "ui-monospace, monospace",
                  minWidth: 200,
                  textAlign: "center",
                }}
              >
                localhost:3000
              </div>
            </div>
          </div>

          {/* Content area below chrome bar — scrolling image */}
          <div
            style={{
              position: "absolute",
              top: 38,
              left: 0,
              right: 0,
              bottom: 0,
              overflow: "hidden",
            }}
          >
            <Img
              src={staticFile("saas-landing-light.png")}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "auto",
                display: "block",
                transform: `translateY(${scrollY}px)`,
                transformOrigin: "top center",
              }}
            />
          </div>

          {/* "Just built" badge — anchored to top of content area */}
          <div
            style={{
              position: "absolute",
              top: 52,
              left: 16,
              background: "rgba(244,240,232,0.95)",
              border: `1px solid ${palette.line}`,
              borderRadius: 6,
              padding: "6px 14px",
              fontSize: 14,
              fontWeight: 500,
              color: palette.accent,
              fontFamily: monoFont,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              zIndex: 10,
            }}
          >
            ✓ Just built
          </div>
        </div>

        {/* Chat panel — Claude's summary */}
        <div
          style={{
            width: 480,
            minWidth: 480,
            height: "100%",
            background: palette.panel,
            borderLeft: "1px solid rgba(0,0,0,0.10)",
            boxShadow: "-12px 0px 36px rgba(0,0,0,0.08)",
            transform: `translateX(${panelX}px)`,
            opacity: panelOpacity,
            display: "flex",
            flexDirection: "column",
            zIndex: 10,
            position: "relative",
          }}
        >
          {/* Header */}
          <header
            style={{
              flexShrink: 0,
              padding: "18px 20px 0",
              borderBottom: `1px solid ${palette.line}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: palette.accent,
                  color: "#fff",
                  fontSize: 15,
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
                <div style={{ fontSize: 18, fontWeight: 600, color: palette.ink, fontFamily: interFont }}>
                  the infinite app
                </div>
                <div style={{ fontSize: 13, color: palette.muted, fontFamily: monoFont, marginTop: 2 }}>
                  claude-opus-4-7 · idle
                </div>
              </div>
            </div>
          </header>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              padding: "18px 20px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* User message */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div
                style={{
                  background: "#1A1918",
                  color: palette.bg,
                  padding: "12px 16px",
                  borderRadius: 16,
                  borderBottomRightRadius: 4,
                  maxWidth: "88%",
                  fontSize: 20,
                  fontFamily: interFont,
                  lineHeight: 1.4,
                }}
              >
                Build me a SaaS landing page.
              </div>
            </div>

            {/* Claude's response with tool summary */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: palette.accent,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: interFont,
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                ∞
              </div>

              <div style={{ flex: 1 }}>
                {/* Tool chips summary — all done */}
                <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                  {["grep", "read", "edit"].map((tool) => (
                    <div
                      key={tool}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: palette.subtle,
                        border: `1px solid ${palette.line}`,
                        borderLeft: `3px solid ${palette.ok}`,
                        padding: "6px 12px 6px 8px",
                        borderRadius: 5,
                        fontSize: 15,
                        fontFamily: monoFont,
                      }}
                    >
                      <span style={{ color: palette.ok, fontWeight: 600 }}>{tool}</span>
                      <span style={{ color: palette.ok, fontSize: 13 }}>✓</span>
                    </div>
                  ))}
                </div>

                {/* Summary text — with generous top breathing room */}
                {SUMMARY_LINES.map((line, i) => {
                  const lineOpacity = interpolate(
                    frame,
                    [10 + i * 6, 22 + i * 6],
                    [0, 1],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                  );
                  const lineY = interpolate(
                    frame,
                    [10 + i * 6, 22 + i * 6],
                    [12, 0],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                  );
                  return (
                    <div
                      key={i}
                      style={{
                        fontSize: i === 0 ? 20 : 17,
                        fontWeight: i === 0 ? 600 : 400,
                        color: i === 0 ? palette.ink : palette.muted,
                        fontFamily: interFont,
                        lineHeight: 1.65,
                        opacity: lineOpacity,
                        transform: `translateY(${lineY}px)`,
                        paddingLeft: i > 0 ? 10 : 0,
                        marginBottom: i === 0 ? 8 : 0,
                      }}
                    >
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Composer */}
          <div
            style={{
              flexShrink: 0,
              padding: "10px 14px",
              borderTop: `1px solid ${palette.line}`,
            }}
          >
            <div
              style={{
                background: palette.bg,
                border: `1px solid ${palette.line}`,
                borderRadius: 8,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                minHeight: 48,
              }}
            >
              <span style={{ fontSize: 15, color: palette.muted, fontFamily: interFont, flex: 1 }}>
                What would you like to change?
              </span>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: palette.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="1.5">
                  <path d="M6 2v8M2 6l4-4 4 4" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Grain />
    </AbsoluteFill>
  );
};
