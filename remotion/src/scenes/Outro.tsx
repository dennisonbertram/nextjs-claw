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

// Scene 6: Outro — 90 frames (3s) — huge CTA, hold for full 3s so viewers can read
// Logo springs in, title fades, terminal box slides up + scales in
// URL fades in last
// NO dim at end — hold full opacity the whole time

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const makeSpring = (startFrame: number, config?: { damping?: number; stiffness?: number }) =>
    spring({
      frame: frame - startFrame,
      fps,
      from: 0,
      to: 1,
      config: { damping: 14, stiffness: 160, ...config },
      durationInFrames: 20,
    });

  const logoSpring = makeSpring(0, { stiffness: 180, damping: 12 });
  const titleSpring = makeSpring(8);
  const cmdSpring = makeSpring(18, { stiffness: 200, damping: 14 });
  const urlSpring = makeSpring(32);

  // Rotating background
  const bgRotation = interpolate(frame, [0, 90], [0, 12], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const makeEntryStyle = (springVal: number, translateY = 24) => ({
    opacity: interpolate(springVal, [0, 0.3, 1], [0, 0.4, 1]),
    transform: `translateY(${interpolate(springVal, [0, 1], [translateY, 0])}px)`,
  });

  // Terminal box: scale 0.8→1.0 + slide up + opacity
  const cmdScale = interpolate(cmdSpring, [0, 1], [0.8, 1.0]);
  const cmdOpacity = interpolate(cmdSpring, [0, 0.3, 1], [0, 0.5, 1]);
  const cmdY = interpolate(cmdSpring, [0, 1], [30, 0]);

  return (
    <AbsoluteFill
      style={{
        background: `conic-gradient(from ${bgRotation}deg at 50% 50%, ${palette.bg} 0%, #ede8dc 45%, ${palette.accentSoft} 55%, ${palette.bg} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          width: "100%",
          maxWidth: 900,
          padding: "0 80px",
        }}
      >
        {/* Logo */}
        <div
          style={{
            opacity: interpolate(logoSpring, [0, 0.3, 1], [0, 0.4, 1]),
            transform: `translateY(${interpolate(logoSpring, [0, 1], [40, 0])}px) scale(${interpolate(logoSpring, [0, 1], [0.5, 1])}) rotate(${interpolate(logoSpring, [0, 1], [-20, 0])}deg)`,
          }}
        >
          <InfiniteLogo size={80} />
        </div>

        {/* Title */}
        <div style={makeEntryStyle(titleSpring)}>
          <div
            style={{
              fontSize: 40,
              fontWeight: 600,
              color: palette.ink,
              fontFamily: interFont,
              letterSpacing: -0.5,
              textAlign: "center",
            }}
          >
            the infinite app
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            opacity: interpolate(titleSpring, [0, 1], [0, 1]),
            transform: `scaleX(${interpolate(titleSpring, [0, 1], [0, 1])})`,
            transformOrigin: "center",
          }}
        >
          <div style={{ width: 40, height: 2, background: palette.accent }} />
        </div>

        {/* Terminal CTA box — massive, dark ink bg, cream fg, coral top-border */}
        <div
          style={{
            opacity: cmdOpacity,
            transform: `translateY(${cmdY}px) scale(${cmdScale})`,
          }}
        >
          <div
            style={{
              background: "#1a1816",
              borderRadius: 10,
              borderTop: `2px solid ${palette.accent}`,
              padding: "28px 48px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 4,
              minWidth: 680,
              boxShadow: "0 8px 40px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)",
            }}
          >
            {/* Terminal prompt line */}
            <div
              style={{
                fontFamily: monoFont,
                fontSize: 22,
                color: "rgba(250,247,242,0.4)",
                fontWeight: 400,
                letterSpacing: 0,
              }}
            >
              $
            </div>
            {/* Main command — massive */}
            <div
              style={{
                fontFamily: monoFont,
                fontSize: 38,
                fontWeight: 500,
                color: "#faf7f2",
                letterSpacing: -0.5,
                lineHeight: 1.2,
              }}
            >
              npx nextjs-claw my-app
            </div>
          </div>
        </div>

        {/* URL */}
        <div style={makeEntryStyle(urlSpring, 10)}>
          <div
            style={{
              fontSize: 18,
              color: palette.muted,
              fontFamily: interFont,
              textDecoration: "underline",
              textDecorationColor: `${palette.muted}66`,
            }}
          >
            github.com/dennisonbertram/nextjs-claw
          </div>
        </div>
      </div>

      <Grain />
    </AbsoluteFill>
  );
};
