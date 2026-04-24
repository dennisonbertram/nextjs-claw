import React from "react";

// Subtle film grain overlay for cinematic premium feel
// Uses SVG feTurbulence at opacity 0.03 with overlay blend mode
export const Grain: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      zIndex: 9999,
      mixBlendMode: "overlay",
      opacity: 0.03,
    }}
  >
    <svg
      width="100%"
      height="100%"
      style={{ display: "block" }}
    >
      <filter id="grain-filter">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.65"
          numOctaves="3"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain-filter)" />
    </svg>
  </div>
);
