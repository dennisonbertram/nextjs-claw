import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { Title } from "./scenes/Title";
import { ShellReveal } from "./scenes/ShellReveal";
import { TemplatePick } from "./scenes/TemplatePick";
import { AgentWorks } from "./scenes/AgentWorks";
import { SnapShowcase } from "./scenes/SnapShowcase";
import { Outro } from "./scenes/Outro";

// v4 pacing — tight 10s, continuous motion, no holds > 20f
// Scene 1: Title        0:00–0:01    → 30 frames  (1.0s)
// Scene 2: ShellReveal  0:01–0:02.5  → 45 frames  (1.5s)
// Scene 3: TemplatePick 0:02.5–0:04  → 45 frames  (1.5s)
// Scene 4: AgentWorks   0:04–0:06.5  → 75 frames  (2.5s)
// Scene 5: ResultScene  0:06.5–0:08.5 → 60 frames (2.0s)
// Scene 6: Outro        0:08.5–0:10  → 45 frames  (1.5s)
// Total: 300 frames = 10s @ 30fps

export const Demo: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        // CSS rendering hints for crisp text and UI (Part D — supersample)
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        textRendering: "geometricPrecision",
        imageRendering: "auto",
      }}
    >
      <Series>
        <Series.Sequence durationInFrames={30}>
          <Title />
        </Series.Sequence>
        <Series.Sequence durationInFrames={45}>
          <ShellReveal />
        </Series.Sequence>
        <Series.Sequence durationInFrames={45}>
          <TemplatePick />
        </Series.Sequence>
        <Series.Sequence durationInFrames={75}>
          <AgentWorks />
        </Series.Sequence>
        <Series.Sequence durationInFrames={60}>
          <SnapShowcase />
        </Series.Sequence>
        <Series.Sequence durationInFrames={45}>
          <Outro />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
