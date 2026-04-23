import React from "react";
import {
  useCurrentFrame,
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

const USER_TEXT = "Build me a SaaS landing page.";

// Scene 3: TemplatePick — 45 frames (1.5s)
// Hover: 0-10f  Click feedback: 10-20f  Bubble snaps in at 20f  Grid fades at 25f

export const TemplatePick: React.FC = () => {
  const frame = useCurrentFrame();

  // SaaS card highlight: quick scale up + border glow over 10 frames
  const saasCardScale = interpolate(
    frame,
    [0, 8, 12, 20, 22],
    [1, 1.04, 0.97, 1.0, 1.0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    }
  );

  const saasHighlightOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // User bubble snaps in at frame 20
  const bubbleOpacity = interpolate(frame, [20, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Typewriter: fast, 20 chars in 20 frames = almost instant
  const charsToShow = Math.floor(
    interpolate(frame, [22, 40], [0, USER_TEXT.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  // Template grid fades out as user bubble appears
  const gridOpacity = interpolate(frame, [25, 38], [1, 0.15], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: palette.bg }}>
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
          }}
        >
          <div style={{ maxWidth: 800, textAlign: "center", padding: "0 40px" }}>
            <div
              style={{
                fontSize: 36,
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
                fontSize: 24,
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
            width: 420,
            minWidth: 420,
            height: "100%",
            background: palette.panel,
            borderLeft: `1px solid ${palette.line}`,
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

          {/* Content */}
          <div
            style={{
              flex: 1,
              padding: "12px 16px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Template grid */}
            <div style={{ opacity: gridOpacity }}>
              <div style={{ marginBottom: 4 }}>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: palette.ink, fontFamily: interFont }}>
                  Start with a template
                </h3>
              </div>
              <p style={{ marginTop: 0, marginBottom: 8, fontSize: 12, color: palette.muted, fontFamily: interFont }}>
                Pick one, or describe your own below.
              </p>
              <div style={{ marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 4 }}>
                {["Popular", "All", "Marketing"].map((label, i) => (
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {TEMPLATES_POPULAR.map((t, i) => (
                  <TemplateCard
                    key={t.slug}
                    slug={t.slug}
                    name={t.name}
                    highlighted={i === 0}
                    highlightOpacity={i === 0 ? saasHighlightOpacity : 0}
                    scale={i === 0 ? saasCardScale : 1}
                  />
                ))}
              </div>
            </div>

            {/* User bubble */}
            {frame >= 20 && (
              <div
                style={{
                  opacity: bubbleOpacity,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <div
                  style={{
                    background: palette.ink,
                    color: palette.bg,
                    padding: "9px 13px",
                    borderRadius: 14,
                    borderBottomRightRadius: 4,
                    maxWidth: "88%",
                    fontSize: 13,
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
              padding: "8px 12px",
              borderTop: `1px solid ${palette.line}`,
            }}
          >
            <div
              style={{
                background: palette.bg,
                border: `1px solid ${palette.line}`,
                borderRadius: 8,
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                minHeight: 44,
              }}
            >
              <span style={{ fontSize: 12, color: palette.muted, fontFamily: interFont, flex: 1 }}>
                Describe what to build...
              </span>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: palette.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="1.5">
                  <path d="M6 2v8M2 6l4-4 4 4" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
