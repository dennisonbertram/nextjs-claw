import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { Title } from "./scenes/Title";
import { ShellReveal } from "./scenes/ShellReveal";
import { TemplatePick } from "./scenes/TemplatePick";
import { AgentWorks } from "./scenes/AgentWorks";
import { SnapShowcase } from "./scenes/SnapShowcase";
import { Outro } from "./scenes/Outro";

// v2 pacing — Gemini review fixes
// Scene 1: Title        0:00–0:02  → 60 frames  (was 45)
// Scene 2: ShellReveal  0:02–0:04  → 60 frames  (was 45)
// Scene 3: TemplatePick 0:04–0:06  → 60 frames  (was 45)
// Scene 4: AgentWorks   0:06–0:09  → 90 frames  (was 150 — faster chips, wipe reveal)
// Scene 5: ResultScene  0:09–0:12  → 90 frames  (was SnapShowcase — scroll payoff)
// Scene 6: Outro        0:12–0:15  → 90 frames  (was 75 — massive CTA, hold full 3s)
// Total: 450 frames = 15s @ 30fps

export const Demo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Series>
        <Series.Sequence durationInFrames={60}>
          <Title />
        </Series.Sequence>
        <Series.Sequence durationInFrames={60}>
          <ShellReveal />
        </Series.Sequence>
        <Series.Sequence durationInFrames={60}>
          <TemplatePick />
        </Series.Sequence>
        <Series.Sequence durationInFrames={90}>
          <AgentWorks />
        </Series.Sequence>
        <Series.Sequence durationInFrames={90}>
          <SnapShowcase />
        </Series.Sequence>
        <Series.Sequence durationInFrames={90}>
          <Outro />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
