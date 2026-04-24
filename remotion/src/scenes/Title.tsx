import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
} from "remotion";
import { palette } from "../palette";
import { InfiniteLogo } from "../components/InfiniteLogo";
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

// Character-by-character reveal with spring pop
function CharReveal({
  text,
  startFrame,
  staggerFrames,
  fontSize,
  fontWeight,
  color,
  letterSpacing,
  fontFamily,
}: {
  text: string;
  startFrame: number;
  staggerFrames: number;
  fontSize: number;
  fontWeight: number;
  color: string;
  letterSpacing?: number;
  fontFamily?: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chars = text.split("");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        flexWrap: "wrap",
        justifyContent: "center",
        overflow: "visible",
      }}
    >
      {chars.map((char, i) => {
        const charFrame = frame - (startFrame + i * staggerFrames);
        const charScale = spring({
          frame: charFrame,
          fps,
          from: 0,
          to: 1,
          config: { damping: 14, stiffness: 240 },
          durationInFrames: 12,
        });
        const charOpacity = interpolate(charFrame, [0, 5], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              fontSize,
              fontWeight,
              fontFamily: fontFamily ?? interFont,
              color,
              letterSpacing: letterSpacing ?? 0,
              lineHeight: 1.1,
              transform: `scale(${charScale})`,
              opacity: charOpacity,
              whiteSpace: char === " " ? "pre" : "normal",
              overflow: "visible",
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
}

// Scene 1: Title — 30 frames (1.0s) — NO hold, everything moves
// Frame 0-8:   logo springs in (scale 0→1, rotate -15°→0°) — stiffness 220
// Frame 5-16:  "the infinite app" chars pop in (0.3f/char, fast)
// Frame 12-22: subtitle chars pop in
// Frame 20-26: value-prop line fades in (Part C)
// Frame 22-30: cross-fade out
// GLOBAL BACKGROUND DRIFT: 0.15°/frame continuously
export const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo spring — faster, higher stiffness
  const logoSpring = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    config: { damping: 14, stiffness: 220 },
    durationInFrames: 12,
  });
  const logoScale = interpolate(logoSpring, [0, 1], [0, 1]);
  const logoRotate = interpolate(logoSpring, [0, 1], [-15, 0]);

  // Continuous subtle breathing on logo after it lands
  const logoBreathe = 1.0 + Math.sin(frame / 8) * 0.006;

  // Overall fade out — tight crossfade starting at 22
  const totalOpacity = interpolate(frame, [22, 30], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Global background drift — 0.15°/frame
  const bgRotation = frame * 0.15;

  // Value-prop line opacity — fades in at frame 20 (Part C)
  const valuePropOpacity = interpolate(frame, [20, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `conic-gradient(from ${bgRotation}deg at 50% 50%, ${palette.bg} 0%, #ede8dc 40%, ${palette.subtle} 70%, ${palette.bg} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 24,
        opacity: totalOpacity,
        overflow: "visible",
      }}
    >
      {/* Logo with spring + rotation + continuous breathe */}
      <div
        style={{
          transform: `scale(${logoScale * logoBreathe}) rotate(${logoRotate}deg)`,
        }}
      >
        <InfiniteLogo size={96} />
      </div>

      {/* Title chars */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          overflow: "visible",
        }}
      >
        {/* Fast stagger 0.3f/char — full title visible by frame 16 */}
        <CharReveal
          text="the infinite app"
          startFrame={5}
          staggerFrames={0.3}
          fontSize={56}
          fontWeight={600}
          color={palette.ink}
          letterSpacing={-1}
        />
        <CharReveal
          text="a Next.js starter that builds itself"
          startFrame={12}
          staggerFrames={0.3}
          fontSize={22}
          fontWeight={400}
          color={palette.muted}
        />

        {/* Value-prop line — Part C: runs locally · your claude subscription · all in your dev */}
        <div
          style={{
            opacity: valuePropOpacity,
            display: "flex",
            alignItems: "center",
            gap: 0,
            marginTop: 4,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontFamily: monoFont,
              color: palette.muted,
              letterSpacing: 0.2,
            }}
          >
            runs locally · your claude subscription · all in your dev
          </span>
        </div>
      </div>

      <Grain />
    </AbsoluteFill>
  );
};
