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

const USER_TEXT = "Build me a SaaS landing page.";

// Scene 3: TemplatePick — 45 frames (1.5s) — continuous motion throughout
// Frame 0-8:   SaaS card gets coral ring highlight (Part C: highlight before click)
// Frame 0-12:  saasHighlightOpacity fades in → coral ring appears
// Frame 8-18:  card scale pulse (hover → click → settle)
// Frame 15-20: user bubble fades in
// Frame 18-38: typewriter text (fast)
// Frame 20-38: grid fades out as bubble appears
// GLOBAL BG DRIFT: 0.1°/frame
// NO hold: scene ends at 45, typewriter finishing at ~38

export const TemplatePick: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // SaaS card coral ring highlight — appears over first 12 frames (Part C)
  const saasHighlightOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // SaaS card click: quick scale up + border glow over frames 8-18
  const saasCardScale = interpolate(
    frame,
    [8, 12, 15, 20],
    [1, 1.04, 0.97, 1.0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    }
  );

  // User bubble snaps in at frame 15 (tighter than v3's 20)
  const bubbleOpacity = interpolate(frame, [15, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Typewriter: 18 chars in 20 frames — fast
  const charsToShow = Math.floor(
    interpolate(frame, [18, 38], [0, USER_TEXT.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  // Template grid fades as bubble appears
  const gridOpacity = interpolate(frame, [20, 35], [1, 0.12], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Global background drift — 0.1°/frame
  const bgRotation = frame * 0.1;

  // Cards stagger 3 frames apart for continuous entry (Part A)
  const { fps: configFps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: `conic-gradient(from ${bgRotation}deg at 40% 60%, ${palette.bg} 0%, #ede8dc 50%, ${palette.bg} 100%)`,
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
        {/* Preview area */}
        <div
          style={{
            flex: 1,
            background: palette.previewBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            border: "1px solid #E5E5E5",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(0,0,0,0.04), 6px 0 24px rgba(0,0,0,0.04)",
            margin: "12px 0 12px 12px",
          }}
        >
          <div style={{ maxWidth: 800, textAlign: "center", padding: "0 40px" }}>
            <div
              style={{
                fontSize: 40,
                fontWeight: 600,
                color: palette.previewFg,
                fontFamily: interFont,
                letterSpacing: -0.5,
                marginBottom: 16,
              }}
            >
              I am an empty canvas.
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 400,
                color: "rgba(245,245,245,0.6)",
                fontFamily: interFont,
              }}
            >
              Describe me.
            </div>
          </div>
        </div>

        {/* Chat panel */}
        <div
          style={{
            width: 480,
            minWidth: 480,
            height: "100%",
            background: palette.panel,
            borderLeft: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "-10px 0px 30px rgba(0,0,0,0.05)",
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
                      lineHeight: 1.35,
                    }}
                  >
                    claude-opus-4-7 · idle
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <div
            style={{
              flex: 1,
              padding: "14px 20px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {/* Template grid */}
            <div style={{ opacity: gridOpacity }}>
              <div style={{ marginBottom: 6 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: palette.ink, fontFamily: interFont }}>
                  Start with a template
                </h3>
              </div>
              <p style={{ marginTop: 0, marginBottom: 10, fontSize: 14, color: palette.muted, fontFamily: interFont }}>
                Pick one, or describe your own below.
              </p>
              <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["Popular", "All", "Marketing"].map((label, i) => (
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
              {/* Cards stagger 3f apart (Part A) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {TEMPLATES_POPULAR.map((t, i) => {
                  const cardStartFrame = i * 3;
                  const cardFrame = frame - cardStartFrame;
                  const cardSpring = spring({
                    frame: cardFrame,
                    fps,
                    from: 0,
                    to: 1,
                    config: { damping: 14, stiffness: 200 },
                    durationInFrames: 10,
                  });
                  const cardY = interpolate(cardSpring, [0, 1], [16, 0]);
                  const cardOpacity = interpolate(cardFrame, [0, 5], [0, 1], {
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
                      <TemplateCard
                        slug={t.slug}
                        name={t.name}
                        highlighted={i === 0}
                        highlightOpacity={i === 0 ? saasHighlightOpacity : 0}
                        scale={i === 0 ? saasCardScale : 1}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* User bubble — snaps in at frame 15 */}
            {frame >= 15 && (
              <div
                style={{
                  opacity: bubbleOpacity,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
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
                  {USER_TEXT.slice(0, charsToShow)}
                  {charsToShow < USER_TEXT.length && (
                    <span style={{ opacity: 0.5 }}>|</span>
                  )}
                </div>
              </div>
            )}
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
                Describe what to build...
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
