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

// Scene 6: Outro — 45 frames (1.5s)
// Frame 0-20: elements spring in (logo, title, divider, CTA box)
//   - Logo: 0f, stiffness 220, damping 14 — fast spring + subtle drift rotation
//   - Title: 6f
//   - CTA box: 12f, scale 0.85→1.0
//   - URL: 22f
// Frame 20-35: value-prop pills fade in, stagger 5f apart (Part C)
// Frame 20-45: CTA box breathes — scale 1.0 ↔ 1.01 oscillation (never static)
// Frame 20-45: Logo drifts 0.5° subtle rotation
// GLOBAL BG DRIFT: 0.2°/frame (fast to feel kinetic)
// NO hold — everything is alive to the end

const VALUE_PROPS = [
  "runs locally",
  "your claude subscription",
  "live dev reloads",
];

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const makeSpring = (startFrame: number, config?: { damping?: number; stiffness?: number }) =>
    spring({
      frame: frame - startFrame,
      fps,
      from: 0,
      to: 1,
      config: { damping: 14, stiffness: 200, ...config },
      durationInFrames: 16,
    });

  const logoSpring = makeSpring(0, { stiffness: 220, damping: 14 });
  const titleSpring = makeSpring(6);
  const cmdSpring = makeSpring(12, { stiffness: 240, damping: 14 });
  const urlSpring = makeSpring(22);

  // Global background drift — 0.2°/frame feels kinetic
  const bgRotation = frame * 0.2;

  const makeEntryStyle = (springVal: number, translateY = 20) => ({
    opacity: interpolate(springVal, [0, 0.3, 1], [0, 0.4, 1]),
    transform: `translateY(${Math.round(interpolate(springVal, [0, 1], [translateY, 0]))}px)`,
  });

  // CTA box: scale 0.85→1.0 spring, then BREATHES 1.0↔1.01 after frame 20
  const cmdScale = interpolate(cmdSpring, [0, 1], [0.85, 1.0]);
  const cmdOpacity = interpolate(cmdSpring, [0, 0.3, 1], [0, 0.5, 1]);
  const cmdY = Math.round(interpolate(cmdSpring, [0, 1], [28, 0]));

  // Breathing oscillation after spring settles — invisible but alive
  const breatheScale = frame >= 20
    ? 1.0 + Math.sin(frame / 12) * 0.005
    : 1.0;
  const finalCmdScale = frame >= 20 ? breatheScale : cmdScale;

  // Logo: subtle drift rotation after landing — 0.5° max
  const logoDrift = frame >= 16 ? Math.sin(frame / 18) * 0.5 : 0;
  const logoRotateEntry = Math.round(interpolate(logoSpring, [0, 1], [-20, 0]));
  const logoScaleEntry = interpolate(logoSpring, [0, 1], [0.5, 1]);

  // Value-prop pills — fade in starting at frame 20, stagger 5f each (Part C)
  const pillOpacities = VALUE_PROPS.map((_, i) => {
    const pillStart = 20 + i * 5;
    return interpolate(frame, [pillStart, pillStart + 8], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  });

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
          gap: 20,
          width: "100%",
          maxWidth: 900,
          padding: "0 80px",
        }}
      >
        {/* Logo — spring in + subtle drift rotation + breathe */}
        <div
          style={{
            opacity: interpolate(logoSpring, [0, 0.3, 1], [0, 0.4, 1]),
            transform: `translateY(${Math.round(interpolate(logoSpring, [0, 1], [40, 0]))}px) scale(${logoScaleEntry}) rotate(${logoRotateEntry + logoDrift}deg)`,
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

        {/* Terminal CTA box — springs in then breathes */}
        <div
          style={{
            opacity: cmdOpacity,
            transform: `translateY(${cmdY}px) scale(${finalCmdScale})`,
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
            {/* Terminal prompt */}
            <div
              style={{
                fontFamily: monoFont,
                fontSize: 22,
                color: "rgba(250,247,242,0.4)",
                fontWeight: 400,
              }}
            >
              $
            </div>
            {/* Main command */}
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

        {/* Value-prop pills — three centered pills staggering in (Part C) */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {VALUE_PROPS.map((prop, i) => (
            <div
              key={prop}
              style={{
                opacity: pillOpacities[i],
                background: palette.accentSoft,
                border: `1px solid ${palette.line}`,
                borderRadius: 999,
                padding: "4px 14px",
                fontSize: 12,
                fontWeight: 500,
                fontFamily: interFont,
                color: palette.ink,
                letterSpacing: 0.2,
                whiteSpace: "nowrap",
              }}
            >
              {prop}
            </div>
          ))}
        </div>

        {/* URL */}
        <div style={makeEntryStyle(urlSpring, 10)}>
          <div
            style={{
              fontSize: 16,
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
