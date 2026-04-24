import React from "react";
import { Composition, Still } from "remotion";
import { Demo } from "./Demo";
import { Banner } from "./Banner";

// Total frames: 30+45+45+75+60+45 = 300 frames @ 30fps = 10s

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Demo"
        component={Demo}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
      <Still id="Banner" component={Banner} width={1280} height={640} />
    </>
  );
};
