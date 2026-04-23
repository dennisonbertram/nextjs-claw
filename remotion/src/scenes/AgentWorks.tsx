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
import { AppShellFrame } from "../components/AppShellFrame";
import { ToolChip, type ToolState } from "../components/ToolChip";
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

// Tool chip data — 40f apart, each runs for ~20f
const TOOLS = [
  { name: "grep", target: "I am an empty canvas", startFrame: 0, flipFrame: 22 },
  { name: "read", target: "app/preview/page.tsx", startFrame: 40, flipFrame: 62 },
  { name: "edit", target: "app/preview/page.tsx", startFrame: 80, flipFrame: 102 },
];

interface ToolChipAnimatedProps {
  name: string;
  target: string;
  startFrame: number;
  flipFrame: number;
  currentFrame: number;
}

const ToolChipAnimated: React.FC<ToolChipAnimatedProps> = ({
  name,
  target,
  startFrame,
  flipFrame,
  currentFrame,
}) => {
  const { fps } = useVideoConfig();
  if (currentFrame < startFrame) return null;

  const chipFrame = currentFrame - startFrame;

  // Bounce in from right
  const entrySpring = spring({
    frame: chipFrame,
    fps,
    from: 0,
    to: 1,
    config: { damping: 12, stiffness: 160 },
    durationInFrames: 14,
  });
  const translateX = interpolate(entrySpring, [0, 1], [60, 0]);
  const opacity = interpolate(chipFrame, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pulse: scale 1↔1.2 + opacity 1↔0.5 every 12 frames
  const pulsePhase = (chipFrame % 12) / 12;
  const pulseScale = interpolate(pulsePhase, [0, 0.5, 1], [1, 1.25, 1]);
  const pulseOpacity = interpolate(pulsePhase, [0, 0.5, 1], [1, 0.4, 1]);

  const isRunning = currentFrame < flipFrame;
  const state: ToolState = isRunning ? "running" : "ok";

  // Border color transition over 8 frames
  const flipProgress = interpolate(
    currentFrame,
    [flipFrame, flipFrame + 8],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        transform: `translateX(${translateX}px)`,
        opacity,
        marginBottom: 6,
      }}
    >
      <ToolChip
        name={name}
        target={target}
        state={state}
        pulseScale={isRunning ? pulseScale : 1}
        pulseOpacity={isRunning ? pulseOpacity : 1}
      />
    </div>
  );
};

// Light empty canvas
const EmptyCanvas: React.FC = () => (
  <div
    style={{
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: palette.previewBg,
    }}
  >
    <div style={{ maxWidth: 600, textAlign: "center", padding: "0 48px" }}>
      <div
        style={{
          border: `1.5px dashed ${palette.line}`,
          borderRadius: 12,
          padding: "48px 32px",
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
);

// Scene 4: AgentWorks — 150 frames (5s)
// Chips stream in at 0, 40, 80f, each run→ok in ~22f
// Preview dissolve at frames 110-140 (scale+opacity+blur transition)
// Assistant text fades in at 120
export const AgentWorks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Preview dissolve at frames 110-140
  // Old content: opacity 1→0, scale 1→1.02 (melting)
  const oldOpacity = interpolate(frame, [110, 140], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const oldScale = interpolate(frame, [110, 140], [1, 1.02], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // New content: opacity 0→1, scale 1.02→1 (crystallizing in)
  const newOpacity = interpolate(frame, [110, 140], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const newScale = interpolate(frame, [110, 140], [1.04, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Assistant text fades in at frame 120
  const assistantTextOpacity = interpolate(frame, [120, 135], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Running pulse for logo dot
  const logoPulsePhase = (frame % 16) / 16;
  const logoPulseOpacity = interpolate(logoPulsePhase, [0, 0.5, 1], [1, 0.3, 1]);

  return (
    <AbsoluteFill style={{ background: palette.bg }}>
      <AppShellFrame
        panelWidth={420}
        children={{
          preview: (
            <div
              style={{
                width: "100%",
                height: "100%",
                position: "relative",
                background: palette.previewBg,
              }}
            >
              {/* Old: empty canvas (melts away) */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: oldOpacity,
                  transform: `scale(${oldScale})`,
                  transformOrigin: "center center",
                }}
              >
                <EmptyCanvas />
              </div>
              {/* New: Ghost SaaS landing (crystallizes in) */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: newOpacity,
                  transform: `scale(${newScale})`,
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
            </div>
          ),
          panel: (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                background: palette.panel,
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
                        position: "relative",
                      }}
                    >
                      ∞
                      {frame < 120 && (
                        <div
                          style={{
                            position: "absolute",
                            top: -2,
                            right: -2,
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: palette.amber,
                            opacity: logoPulseOpacity,
                          }}
                        />
                      )}
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
                        claude-opus-4-7 · {frame < 120 ? "working" : "idle"}
                      </div>
                    </div>
                  </div>
                </div>
              </header>

              {/* Messages */}
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
                {/* User message */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
                    Build me a SaaS landing page.
                  </div>
                </div>

                {/* Assistant response */}
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  {/* Avatar */}
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 5,
                      background: palette.accent,
                      color: "#fff",
                      fontSize: 11,
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

                  {/* Tool chips + text */}
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {TOOLS.map((tool) => (
                      <ToolChipAnimated
                        key={tool.name + tool.target}
                        name={tool.name}
                        target={tool.target}
                        startFrame={tool.startFrame}
                        flipFrame={tool.flipFrame}
                        currentFrame={frame}
                      />
                    ))}

                    {/* Assistant text */}
                    {frame >= 120 && (
                      <div
                        style={{
                          opacity: assistantTextOpacity,
                          fontSize: 13,
                          color: palette.ink,
                          fontFamily: interFont,
                          lineHeight: 1.5,
                          marginTop: 4,
                        }}
                      >
                        Wrote the landing page — hero, features, pricing.
                      </div>
                    )}
                  </div>
                </div>
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
                  <span
                    style={{
                      fontSize: 12,
                      color: palette.muted,
                      fontFamily: interFont,
                      flex: 1,
                    }}
                  >
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
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="white"
                      strokeWidth="1.5"
                    >
                      <path d="M6 2v8M2 6l4-4 4 4" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ),
        }}
      />
    </AbsoluteFill>
  );
};
