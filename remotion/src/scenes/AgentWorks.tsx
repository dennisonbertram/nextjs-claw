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

// Scene 4: AgentWorks — 90 frames (3s)
// Chips snap in FAST: 0, 8, 16, 24f starts each springs in over 15f
// Each "running → ok" in ~10f after appearing
// Chip sequence complete ~40f
// Left panel: skeleton pulse loader while chips run (0-45f)
// Wipe reveal starts at 45f, completes 60f
// Leave 30f to breathe (60-90f)

// Tool chips — fast 8f stagger
const TOOLS = [
  { name: "grep", target: "I am an empty canvas", startFrame: 0, flipFrame: 14 },
  { name: "read", target: "app/preview/page.tsx", startFrame: 8, flipFrame: 22 },
  { name: "edit", target: "app/preview/page.tsx", startFrame: 16, flipFrame: 30 },
];

const WIPE_START = 45;
const WIPE_END = 60;

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
    config: { damping: 14, stiffness: 220 },
    durationInFrames: 14,
  });
  const translateX = interpolate(entrySpring, [0, 1], [50, 0]);
  const opacity = interpolate(chipFrame, [0, 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pulse: scale 1↔1.2 + opacity 1↔0.5 every 10 frames
  const pulsePhase = (chipFrame % 10) / 10;
  const pulseScale = interpolate(pulsePhase, [0, 0.5, 1], [1, 1.2, 1]);
  const pulseOpacity = interpolate(pulsePhase, [0, 0.5, 1], [1, 0.45, 1]);

  const isRunning = currentFrame < flipFrame;
  const state: ToolState = isRunning ? "running" : "ok";

  // Vertical timeline connector line — coral tint
  // Connects prompt bubble to first chip, and chip to chip
  const lineOpacity = interpolate(chipFrame, [5, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "relative" }}>
      {/* Timeline vertical stroke above chip */}
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
        {/* Timeline connector from this chip to next */}
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

// Skeleton loader — 3 pulsing bars simulating content building
const SkeletonLoader: React.FC<{ frame: number }> = ({ frame }) => {
  const pulsePhase = (frame % 20) / 20;
  const pulseOpacity = interpolate(pulsePhase, [0, 0.5, 1], [0.4, 0.8, 0.4]);

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
            // Stagger the pulse per bar
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

// Empty canvas with pulsing glow
const EmptyCanvas: React.FC<{ frame: number }> = ({ frame }) => {
  const glowPhase = (frame % 40) / 40;
  const glowOpacity = interpolate(glowPhase, [0, 0.5, 1], [0.08, 0.18, 0.08]);

  return (
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
            boxShadow: `0 0 40px rgba(194, 65, 12, ${glowOpacity})`,
            transition: "box-shadow 0.1s",
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
  );
};

export const AgentWorks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // clipPath wipe: new site reveals from top to bottom over frames WIPE_START→WIPE_END
  const wipeProgress = interpolate(frame, [WIPE_START, WIPE_END], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Old canvas: scale away + opacity to 0 as wipe starts
  const oldOpacity = interpolate(frame, [WIPE_START, WIPE_START + 10], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const oldScale = interpolate(frame, [WIPE_START, WIPE_START + 10], [1, 0.92], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Skeleton: shows while chips are running, fades when wipe begins
  const skeletonOpacity = interpolate(frame, [0, 8, WIPE_START - 5, WIPE_START], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Assistant text fades in after wipe completes
  const assistantTextOpacity = interpolate(frame, [WIPE_END, WIPE_END + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Running pulse for logo dot
  const logoPulsePhase = (frame % 16) / 16;
  const logoPulseOpacity = interpolate(logoPulsePhase, [0, 0.5, 1], [1, 0.3, 1]);

  // Timeline vertical line from prompt bubble to chips (fades in with first chip)
  const timelineOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isWorking = frame < WIPE_END;

  return (
    <AbsoluteFill style={{ background: palette.bg }}>
      <AppShellFrame
        panelWidth={480}
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
              {/* Skeleton loader — shows while AI "thinks" */}
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

              {/* Old canvas — melts away when wipe starts */}
              {frame < WIPE_START && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: oldOpacity,
                    transform: `scale(${oldScale})`,
                    transformOrigin: "center center",
                    zIndex: 2,
                  }}
                >
                  <EmptyCanvas frame={frame} />
                </div>
              )}

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
                        position: "relative",
                      }}
                    >
                      ∞
                      {isWorking && (
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
                      )}
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
                        claude-opus-4-7 · {isWorking ? "working" : "idle"}
                      </div>
                    </div>
                  </div>
                </div>
              </header>

              {/* Messages */}
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
                    {/* Vertical timeline stroke from prompt bubble bottom to first chip */}
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

                    {/* Assistant text — after wipe completes */}
                    {frame >= WIPE_END && (
                      <div
                        style={{
                          opacity: assistantTextOpacity,
                          fontSize: 18,
                          color: palette.ink,
                          fontFamily: interFont,
                          lineHeight: 1.5,
                          marginTop: 6,
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
