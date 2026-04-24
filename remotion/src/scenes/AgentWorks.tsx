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

// Scene 4: AgentWorks — 75 frames (2.5s)
// Chips fire 5f apart: 0, 5, 10, 15 (4 chips)
// Each running→ok in ~12f after appearing
// Skeleton: 0-40f
// Wipe reveal: starts at 40f, completes 55f
// Assistant text: fades in at 55f
// Logo amber dot pulses THROUGHOUT entire scene (not just while working)
// Green localhost dot shown in chrome bar (Part C)
// NO hold > 20f — continuous skeleton pulse keeps motion alive

// Tool chips — fast 5f stagger
const TOOLS = [
  { name: "grep", target: "I am an empty canvas", startFrame: 0, flipFrame: 12 },
  { name: "read", target: "app/preview/page.tsx", startFrame: 5, flipFrame: 17 },
  { name: "edit", target: "app/preview/page.tsx", startFrame: 10, flipFrame: 22 },
  { name: "write", target: "app/page.tsx", startFrame: 15, flipFrame: 27 },
];

const WIPE_START = 40;
const WIPE_END = 55;

interface ToolChipAnimatedProps {
  name: string;
  target: string;
  startFrame: number;
  flipFrame: number;
  currentFrame: number;
  isLast: boolean;
  nextChipStart?: number;
}

const ToolChipAnimated: React.FC<ToolChipAnimatedProps> = ({
  name,
  target,
  startFrame,
  flipFrame,
  currentFrame,
  isLast,
  nextChipStart,
}) => {
  const { fps } = useVideoConfig();
  if (currentFrame < startFrame) return null;

  const chipFrame = currentFrame - startFrame;

  // Fast bounce in from right — high stiffness spring
  const entrySpring = spring({
    frame: chipFrame,
    fps,
    from: 0,
    to: 1,
    config: { damping: 14, stiffness: 240 },
    durationInFrames: 12,
  });
  // Pixel-snap the translateX once settled
  const translateXRaw = interpolate(entrySpring, [0, 1], [50, 0]);
  const translateX = chipFrame > 14 ? Math.round(translateXRaw) : translateXRaw;
  const opacity = interpolate(chipFrame, [0, 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Continuous pulse while running — ALWAYS pulsing, not just briefly
  const pulsePhase = (currentFrame % 12) / 12;
  const pulseScale = interpolate(pulsePhase, [0, 0.5, 1], [1, 1.25, 1]);
  const pulseOpacity = interpolate(pulsePhase, [0, 0.5, 1], [1, 0.4, 1]);

  const isRunning = currentFrame < flipFrame;
  const state: ToolState = isRunning ? "running" : "ok";

  const lineOpacity = interpolate(chipFrame, [4, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "relative" }}>
      {!isLast && (
        <div
          style={{
            position: "absolute",
            left: 14,
            bottom: "100%",
            width: 2,
            height: 8,
            background: "rgba(194, 65, 12, 0.25)",
            opacity: lineOpacity,
          }}
        />
      )}
      <div
        style={{
          transform: `translateX(${translateX}px)`,
          opacity,
          marginBottom: 10,
          position: "relative",
        }}
      >
        <ToolChip
          name={name}
          target={target}
          state={state}
          pulseScale={isRunning ? pulseScale : 1}
          pulseOpacity={isRunning ? pulseOpacity : 1}
        />
        {!isLast && currentFrame >= (nextChipStart ?? 999) && (
          <div
            style={{
              position: "absolute",
              left: 14,
              top: "100%",
              width: 2,
              height: 10,
              background: "rgba(194, 65, 12, 0.2)",
            }}
          />
        )}
      </div>
    </div>
  );
};

// Skeleton loader — continuously pulsing
const SkeletonLoader: React.FC<{ frame: number }> = ({ frame }) => {
  const pulsePhase = (frame % 20) / 20;
  const pulseOpacity = interpolate(pulsePhase, [0, 0.5, 1], [0.4, 0.85, 0.4]);

  const bars = [
    { width: "80%", height: 18 },
    { width: "60%", height: 14 },
    { width: "70%", height: 14 },
    { width: "45%", height: 14 },
    { width: "85%", height: 32 },
    { width: "55%", height: 14 },
  ];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "60px 80px",
        gap: 16,
        background: palette.previewBg,
      }}
    >
      {bars.map((bar, i) => (
        <div
          key={i}
          style={{
            width: bar.width,
            height: bar.height,
            borderRadius: 4,
            background: palette.subtle,
            opacity: pulseOpacity,
            transform: `scaleX(${interpolate(
              ((frame + i * 3) % 20) / 20,
              [0, 0.5, 1],
              [0.97, 1.0, 0.97]
            )})`,
            transformOrigin: "left center",
          }}
        />
      ))}
    </div>
  );
};

export const AgentWorks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Wipe progress — pixel-snapped after 55
  const wipeProgressRaw = interpolate(frame, [WIPE_START, WIPE_END], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const wipeProgress = frame >= WIPE_END ? 100 : wipeProgressRaw;

  // Skeleton: shows while chips run, fades when wipe begins
  const skeletonOpacity = interpolate(frame, [0, 6, WIPE_START - 4, WIPE_START], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Assistant text fades in after wipe completes
  const assistantTextOpacity = interpolate(frame, [WIPE_END, WIPE_END + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Logo amber dot — pulses ALWAYS during this scene, not just while working
  const logoPulsePhase = (frame % 16) / 16;
  const logoPulseOpacity = interpolate(logoPulsePhase, [0, 0.5, 1], [1, 0.25, 1]);

  // Timeline vertical line from prompt bubble
  const timelineOpacity = interpolate(frame, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Global background drift
  const bgRotation = frame * 0.08;

  return (
    <AbsoluteFill
      style={{
        background: `conic-gradient(from ${bgRotation}deg at 45% 55%, ${palette.bg} 0%, #ede8dc 50%, ${palette.bg} 100%)`,
      }}
    >
      <AppShellFrame
        panelWidth={480}
        showLiveDot={true}
        children={{
          preview: (
            <div
              style={{
                width: "100%",
                height: "100%",
                position: "relative",
                background: palette.previewBg,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {/* Skeleton loader — continuously pulsing */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: skeletonOpacity,
                  zIndex: 1,
                }}
              >
                <SkeletonLoader frame={frame} />
              </div>

              {/* New site — clipPath wipe reveal from top to bottom */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  clipPath: `inset(0 0 ${100 - wipeProgress}% 0)`,
                  zIndex: 3,
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
                  padding: "14px 20px 0",
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
                        position: "relative",
                      }}
                    >
                      ∞
                      {/* Amber dot pulses ALWAYS during AgentWorks */}
                      <div
                        style={{
                          position: "absolute",
                          top: -3,
                          right: -3,
                          width: 9,
                          height: 9,
                          borderRadius: 999,
                          background: palette.amber,
                          opacity: logoPulseOpacity,
                        }}
                      />
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
                        claude-opus-4-7 · working
                      </div>
                    </div>
                  </div>
                </div>
              </header>

              {/* Messages — 16px padding for breathing room (Part B) */}
              <div
                style={{
                  flex: 1,
                  padding: "16px 20px",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
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
                      maxWidth: "86%",
                      fontSize: 18,
                      fontFamily: interFont,
                      lineHeight: 1.4,
                    }}
                  >
                    Build me a SaaS landing page.
                  </div>
                </div>

                {/* Assistant response */}
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  {/* Avatar */}
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

                  {/* Tool chips + timeline + text */}
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 0,
                      position: "relative",
                    }}
                  >
                    {/* Vertical timeline stroke */}
                    <div
                      style={{
                        position: "absolute",
                        left: 12,
                        top: -14,
                        width: 2,
                        height: 14,
                        background: "rgba(194, 65, 12, 0.2)",
                        opacity: timelineOpacity,
                      }}
                    />

                    {TOOLS.map((tool, idx) => (
                      <ToolChipAnimated
                        key={tool.name + tool.target}
                        name={tool.name}
                        target={tool.target}
                        startFrame={tool.startFrame}
                        flipFrame={tool.flipFrame}
                        currentFrame={frame}
                        isLast={idx === TOOLS.length - 1}
                        nextChipStart={TOOLS[idx + 1]?.startFrame}
                      />
                    ))}

                    {/* Assistant text after wipe completes */}
                    {frame >= WIPE_END && (
                      <div
                        style={{
                          opacity: assistantTextOpacity,
                          fontSize: 17,
                          color: palette.ink,
                          fontFamily: interFont,
                          lineHeight: 1.5,
                          marginTop: 8,
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
                  <span
                    style={{
                      fontSize: 15,
                      color: palette.muted,
                      fontFamily: interFont,
                      flex: 1,
                    }}
                  >
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
                    <svg
                      width="14"
                      height="14"
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
      <Grain />
    </AbsoluteFill>
  );
};
