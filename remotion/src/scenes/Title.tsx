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
import { InfiniteLogo } from "../components/InfiniteLogo";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: interFont } = loadInter("normal", {
  weights: ["400", "500", "600", "700"],
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
}: {
  text: string;
  startFrame: number;
  staggerFrames: number;
  fontSize: number;
  fontWeight: number;
  color: string;
  letterSpacing?: number;
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
      }}
    >
      {chars.map((char, i) => {
        const charFrame = frame - (startFrame + i * staggerFrames);
        const charScale = spring({
          frame: charFrame,
          fps,
          from: 0,
          to: 1,
          config: { damping: 14, stiffness: 200 },
          durationInFrames: 18,
        });
        const charOpacity = interpolate(charFrame, [0, 8], [0, 1], {
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
              fontFamily: interFont,
              color,
              letterSpacing: letterSpacing ?? 0,
              lineHeight: 1.1,
              transform: `scale(${charScale})`,
              opacity: charOpacity,
              whiteSpace: char === " " ? "pre" : "normal",
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
}

// Scene 1: Title — 45 frames (1.5s)
// Frame 0-10: logo springs in (scale 0→1, rotate -15°→0°)
// Frame 10-30: title chars pop in (stagger 1f each)
// Frame 28-38: subtitle chars pop in
// Frame 35-45: fade out
export const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo spring: scale 0→1, rotate -15°→0°
  const logoSpring = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    config: { damping: 12, stiffness: 120 },
    durationInFrames: 18,
  });
  const logoScale = interpolate(logoSpring, [0, 1], [0, 1]);
  const logoRotate = interpolate(logoSpring, [0, 1], [-15, 0]);

  // Overall fade out at end
  const totalOpacity = interpolate(frame, [36, 45], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle rotating background gradient
  const bgRotation = interpolate(frame, [0, 45], [0, 8], {
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
        gap: 28,
        opacity: totalOpacity,
      }}
    >
      {/* Logo with spring + rotation */}
      <div
        style={{
          transform: `scale(${logoScale}) rotate(${logoRotate}deg)`,
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
        }}
      >
        <CharReveal
          text="the infinite app"
          startFrame={10}
          staggerFrames={1}
          fontSize={48}
          fontWeight={600}
          color={palette.ink}
          letterSpacing={-1}
        />
        <CharReveal
          text="a Next.js starter that builds itself"
          startFrame={26}
          staggerFrames={0.7}
          fontSize={18}
          fontWeight={400}
          color={palette.muted}
        />
      </div>
    </AbsoluteFill>
  );
};
