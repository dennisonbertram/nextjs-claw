import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
} from "remotion";
import { palette } from "../palette";
import { TemplateCard } from "../components/TemplateCard";
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

const TEMPLATES_POPULAR = [
  { slug: "01-saas-landing", name: "SaaS Landing" },
  { slug: "03-portfolio-dev", name: "Dev Portfolio" },
  { slug: "06-dashboard-shell", name: "Dashboard" },
  { slug: "11-newsletter-creator", name: "Newsletter" },
  { slug: "08-agency", name: "Agency" },
  { slug: "09-restaurant-local", name: "Restaurant" },
];

// Scene 2: ShellReveal — 60 frames (2s) — preview + panel compose cleanly, less rushed
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
  const bgRotation = interpolate(frame, [0, 60], [0, 5], {
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
        {/* Preview area — macOS window frame */}
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
            borderRadius: 12,
            border: "1px solid #E5E5E5",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(0,0,0,0.04), 6px 0 24px rgba(0,0,0,0.04)",
            margin: "12px 0 12px 12px",
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
            {/* Dashed placeholder box — with pulsing glow */}
            <div
              style={{
                border: `1.5px dashed ${palette.line}`,
                borderRadius: 12,
                padding: "48px 32px",
                marginBottom: 24,
                boxShadow: `0 0 40px rgba(194, 65, 12, 0.08)`,
              }}
            >
              <div
                style={{
                  fontSize: 36,
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
                  fontSize: 22,
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

        {/* Chat panel (cream) — with left-edge depth shadow */}
        <div
          style={{
            width: 480,
            minWidth: 480,
            height: "100%",
            background: palette.panel,
            borderLeft: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "-10px 0px 30px rgba(0,0,0,0.05)",
            transform: `translateX(${panelX}px) scale(${panelScale})`,
            transformOrigin: "right center",
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      letterSpacing: -0.2,
                      color: palette.ink,
                      fontFamily: interFont,
                    }}
                  >
                    the infinite app
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: palette.muted,
                      fontFamily: monoFont,
                      marginTop: 2,
                    }}
                  >
                    claude-opus-4-7 · idle
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Template picker with staggered cards */}
          <div style={{ flex: 1, padding: "14px 20px", overflow: "hidden" }}>
            <div style={{ marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: palette.ink, fontFamily: interFont }}>
                Start with a template
              </h3>
            </div>
            <p style={{ marginTop: 0, marginBottom: 10, fontSize: 14, color: palette.muted, fontFamily: interFont }}>
              Pick one, or describe your own below.
            </p>
            <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["Popular", "All", "Marketing", "Portfolio"].map((label, i) => (
                <div
                  key={label}
                  style={{
                    borderRadius: 999,
                    padding: "3px 12px",
                    fontSize: 13,
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {TEMPLATES_POPULAR.map((t, cardIdx) => {
                // Each card staggers 5 frames apart, starts at frame 8
                const cardStartFrame = 8 + cardIdx * 5;
                const cardFrame = frame - cardStartFrame;
                const cardSpring = spring({
                  frame: cardFrame,
                  fps,
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
      <Grain />
    </AbsoluteFill>
  );
};
