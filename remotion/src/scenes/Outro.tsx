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

// Scene 6: Outro — 75 frames (2.5s)
// Each element springs in staggered over first 45f
// Hold from 45-60f, then dim 60-75f
export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const makeSpring = (startFrame: number) =>
    spring({
      frame: frame - startFrame,
      fps,
      from: 0,
      to: 1,
      config: { damping: 14, stiffness: 160 },
      durationInFrames: 16,
    });

  const logoSpring = makeSpring(0);
  const titleSpring = makeSpring(8);
  const dividerSpring = makeSpring(15);
  const cmdSpring = makeSpring(22);
  const urlSpring = makeSpring(30);

  // Whole composition dims at the very end
  const outroOpacity = interpolate(frame, [58, 75], [1, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Rotating background
  const bgRotation = interpolate(frame, [0, 75], [0, 12], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const makeEntryStyle = (springVal: number, translateY = 20) => ({
    opacity: interpolate(springVal, [0, 0.3, 1], [0, 0.4, 1]),
    transform: `translateY(${interpolate(springVal, [0, 1], [translateY, 0])}px)`,
  });

  return (
    <AbsoluteFill
      style={{
        background: `conic-gradient(from ${bgRotation}deg at 50% 50%, ${palette.bg} 0%, #ede8dc 45%, ${palette.accentSoft} 55%, ${palette.bg} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: outroOpacity,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        {/* Logo */}
        <div
          style={{
            ...makeEntryStyle(logoSpring, 30),
            transform: `translateY(${interpolate(logoSpring, [0, 1], [30, 0])}px) scale(${interpolate(logoSpring, [0, 1], [0.5, 1])}) rotate(${interpolate(logoSpring, [0, 1], [-20, 0])}deg)`,
          }}
        >
          <InfiniteLogo size={72} />
        </div>

        {/* Title */}
        <div style={makeEntryStyle(titleSpring)}>
          <div
            style={{
              fontSize: 32,
              fontWeight: 600,
              color: palette.ink,
              fontFamily: interFont,
              letterSpacing: -0.5,
            }}
          >
            the infinite app
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            opacity: interpolate(dividerSpring, [0, 1], [0, 1]),
            transform: `scaleX(${interpolate(dividerSpring, [0, 1], [0, 1])})`,
            transformOrigin: "center",
          }}
        >
          <div
            style={{
              width: 32,
              height: 1,
              background: palette.accent,
            }}
          />
        </div>

        {/* Command */}
        <div style={makeEntryStyle(cmdSpring)}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: palette.subtle,
              border: `1px solid ${palette.line}`,
              borderRadius: 6,
              padding: "8px 12px",
              fontFamily: monoFont,
              fontSize: 18,
              color: palette.ink,
            }}
          >
            npx nextjs-claw my-app
          </div>
        </div>

        {/* URL */}
        <div style={makeEntryStyle(urlSpring, 10)}>
          <div
            style={{
              fontSize: 14,
              color: palette.muted,
              fontFamily: interFont,
              textDecoration: "underline",
            }}
          >
            github.com/dennisonbertram/nextjs-claw
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
