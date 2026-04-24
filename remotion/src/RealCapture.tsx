import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  OffthreadVideo,
  staticFile,
} from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { InfiniteLogo } from "./components/InfiniteLogo";
import { palette } from "./palette";

// 1.5s intro (45f) + 8s body (240f) + 2s outro (60f) = 345f @ 30fps = 11.5s

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 180 },
  });
  const textOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        background: palette.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        textRendering: "geometricPrecision",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            transform: `scale(${logoSpring})`,
            display: "inline-block",
          }}
        >
          <InfiniteLogo size={72} />
        </div>
        <div style={{ opacity: textOpacity, marginTop: 24 }}>
          <h1
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 48,
              fontWeight: 600,
              letterSpacing: -1,
              color: palette.ink,
              margin: 0,
            }}
          >
            the infinite app
          </h1>
          <p
            style={{
              fontFamily: "monospace",
              fontSize: 16,
              color: palette.muted,
              marginTop: 12,
              margin: "12px 0 0 0",
            }}
          >
            runs locally · your claude subscription · all in your dev
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Body: React.FC = () => (
  <AbsoluteFill style={{ background: palette.bg }}>
    <OffthreadVideo
      src={staticFile("real-capture-body.webm")}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        background: palette.bg,
      }}
    />
  </AbsoluteFill>
);

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const boxSpring = spring({ frame, fps, config: { damping: 12, stiffness: 150 } });
  const pillOpacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        background: palette.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 24,
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        textRendering: "geometricPrecision",
      }}
    >
      <InfiniteLogo size={56} />
      <h2
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 28,
          fontWeight: 600,
          color: palette.ink,
          margin: 0,
        }}
      >
        the infinite app
      </h2>
      <div
        style={{
          transform: `scale(${boxSpring})`,
          fontFamily: "monospace",
          fontSize: 32,
          fontWeight: 500,
          background: palette.ink,
          color: palette.bg,
          padding: "18px 32px",
          borderRadius: 10,
          borderTop: `2px solid ${palette.accent}`,
        }}
      >
        npx nextjs-claw my-app
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          opacity: pillOpacity,
        }}
      >
        {["runs locally", "your claude subscription", "live dev reloads"].map(
          (label) => (
            <span
              key={label}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: `1px solid ${palette.line}`,
                background: palette.accentSoft,
                color: palette.ink,
                fontSize: 11,
                fontWeight: 500,
                fontFamily: "Inter, sans-serif",
              }}
            >
              {label}
            </span>
          )
        )}
      </div>
    </AbsoluteFill>
  );
};

export const RealCapture: React.FC = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={45}>
      <Intro />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={fade()}
      timing={springTiming({
        config: { damping: 200 },
        durationInFrames: 10,
      })}
    />
    <TransitionSeries.Sequence durationInFrames={240}>
      <Body />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={fade()}
      timing={springTiming({
        config: { damping: 200 },
        durationInFrames: 10,
      })}
    />
    <TransitionSeries.Sequence durationInFrames={60}>
      <Outro />
    </TransitionSeries.Sequence>
  </TransitionSeries>
);
