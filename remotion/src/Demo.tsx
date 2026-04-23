import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { Title } from "./scenes/Title";
import { ShellReveal } from "./scenes/ShellReveal";
import { TemplatePick } from "./scenes/TemplatePick";
import { AgentWorks } from "./scenes/AgentWorks";
import { SnapShowcase } from "./scenes/SnapShowcase";
import { Outro } from "./scenes/Outro";

// Compressed 15-second storyboard at 30fps
// Scene 1: Title        0:00–0:01.5  → 45 frames
// Scene 2: ShellReveal  0:01.5–0:03  → 45 frames
// Scene 3: TemplatePick 0:03–0:04.5  → 45 frames
// Scene 4: AgentWorks   0:04.5–0:09.5 → 150 frames
// Scene 5: SnapShowcase 0:09.5–0:12.5 → 90 frames
// Scene 6: Outro        0:12.5–0:15  → 75 frames
// Total: 450 frames = 15s

export const Demo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Series>
        <Series.Sequence durationInFrames={45}>
          <Title />
        </Series.Sequence>
        <Series.Sequence durationInFrames={45}>
          <ShellReveal />
        </Series.Sequence>
        <Series.Sequence durationInFrames={45}>
          <TemplatePick />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <AgentWorks />
        </Series.Sequence>
        <Series.Sequence durationInFrames={90}>
          <SnapShowcase />
        </Series.Sequence>
        <Series.Sequence durationInFrames={75}>
          <Outro />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
