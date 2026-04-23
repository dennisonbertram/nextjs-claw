import React from "react";
import { Composition, Still } from "remotion";
import { Demo } from "./Demo";
import { Banner } from "./Banner";

// Total frames: 45+45+45+150+90+75 = 450 frames @ 30fps = 15s

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Demo"
        component={Demo}
        durationInFrames={450}
        fps={30}
        width={1920}
        height={1080}
      />
      <Still id="Banner" component={Banner} width={1280} height={640} />
    </>
  );
};
