import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
  AbsoluteFill,
} from "remotion";
import { palette } from "../palette";
import { TemplateCard } from "../components/TemplateCard";
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

const TEMPLATES_POPULAR = [
  { slug: "01-saas-landing", name: "SaaS Landing" },
  { slug: "03-portfolio-dev", name: "Dev Portfolio" },
  { slug: "06-dashboard-shell", name: "Dashboard" },
  { slug: "11-newsletter-creator", name: "Newsletter" },
  { slug: "08-agency", name: "Agency" },
  { slug: "09-restaurant-local", name: "Restaurant" },
];

// Scene 2: ShellReveal — 45 frames (1.5s)
// Both slide in simultaneously over 20f with parallax
// Cards stagger in 8-10 frames apart
export const ShellReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Preview parallax entry: slides from left + slight y offset
  const previewSpring = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    config: { damping: 18, stiffness: 140 },
    durationInFrames: 20,
  });
  const previewX = interpolate(previewSpring, [0, 1], [-80, 0]);
  const previewY = interpolate(previewSpring, [0, 1], [12, 0]);
  const previewOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Panel entry from right with scale lift (0.98→1)
  const panelSpring = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    config: { damping: 18, stiffness: 140 },
    durationInFrames: 22,
  });
  const panelX = interpolate(panelSpring, [0, 1], [80, 0]);
  const panelScale = interpolate(panelSpring, [0, 1], [0.97, 1]);
  const panelOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Background pulse
  const bgRotation = interpolate(frame, [0, 45], [0, 5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `conic-gradient(from ${bgRotation}deg at 30% 70%, ${palette.bg} 0%, #ede8dc 50%, ${palette.bg} 100%)`,
      }}
    >
      <div
        style={{
          width: 1920,
          height: 1080,
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
        }}
      >
        {/* Preview area (light paper) */}
        <div
          style={{
            flex: 1,
            background: palette.previewBg,
            overflow: "hidden",
            transform: `translateX(${previewX}px) translateY(${previewY}px)`,
            opacity: previewOpacity,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* Centered placeholder */}
          <div
            style={{
              maxWidth: 600,
              textAlign: "center",
              padding: "0 48px",
            }}
          >
            {/* Dashed placeholder box */}
            <div
              style={{
                border: `1.5px dashed ${palette.line}`,
                borderRadius: 12,
                padding: "48px 32px",
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 600,
                  color: palette.ink,
                  fontFamily: interFont,
                  letterSpacing: -0.5,
                  marginBottom: 12,
                }}
              >
                I am an empty canvas.
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 400,
                  color: palette.muted,
                  fontFamily: interFont,
                }}
              >
                Describe me.
              </div>
            </div>
          </div>
        </div>

        {/* Chat panel (cream) */}
        <div
          style={{
            width: 420,
            minWidth: 420,
            height: "100%",
            background: palette.panel,
            borderLeft: `1px solid ${palette.line}`,
            transform: `translateX(${panelX}px) scale(${panelScale})`,
            transformOrigin: "right center",
            opacity: panelOpacity,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
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
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      letterSpacing: -0.1,
                      color: palette.ink,
                      fontFamily: interFont,
                    }}
                  >
                    the infinite app
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: palette.muted,
                      fontFamily: monoFont,
                      marginTop: 1,
                    }}
                  >
                    claude-opus-4-7 · idle
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Template picker with staggered cards */}
          <div style={{ flex: 1, padding: "12px 16px", overflow: "hidden" }}>
            <div style={{ marginBottom: 4 }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: palette.ink, fontFamily: interFont }}>
                Start with a template
              </h3>
            </div>
            <p style={{ marginTop: 0, marginBottom: 8, fontSize: 12, color: palette.muted, fontFamily: interFont }}>
              Pick one, or describe your own below.
            </p>
            <div style={{ marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {["Popular", "All", "Marketing", "Portfolio"].map((label, i) => (
                <div
                  key={label}
                  style={{
                    borderRadius: 999,
                    padding: "2px 10px",
                    fontSize: 11,
                    fontFamily: monoFont,
                    background: i === 0 ? palette.accentSoft : "none",
                    color: i === 0 ? palette.accent : palette.muted,
                    border: `1px solid ${i === 0 ? palette.accent + "55" : "transparent"}`,
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
            {/* Staggered template cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {TEMPLATES_POPULAR.map((t, cardIdx) => {
                // Each card staggers 5 frames apart, starts at frame 8
                const cardStartFrame = 8 + cardIdx * 5;
                const cardFrame = frame - cardStartFrame;
                const { fps: videoFps } = { fps: 30 };
                const cardSpring = spring({
                  frame: cardFrame,
                  fps: videoFps,
                  from: 0,
                  to: 1,
                  config: { damping: 16, stiffness: 160 },
                  durationInFrames: 12,
                });
                const cardY = interpolate(cardSpring, [0, 1], [20, 0]);
                const cardOpacity = interpolate(cardFrame, [0, 8], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                return (
                  <div
                    key={t.slug}
                    style={{
                      transform: `translateY(${cardY}px)`,
                      opacity: cardOpacity,
                    }}
                  >
                    <TemplateCard slug={t.slug} name={t.name} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
