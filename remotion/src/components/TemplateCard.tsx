import React from "react";
import { Img, staticFile } from "remotion";
import { palette } from "../palette";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: interFont } = loadInter("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

interface Props {
  slug: string;
  name: string;
  highlighted?: boolean;
  highlightOpacity?: number;
  scale?: number;
}

export const TemplateCard: React.FC<Props> = ({
  slug,
  name,
  highlighted = false,
  highlightOpacity = 0,
  scale = 1,
}) => {
  const borderColor = highlighted ? palette.accent : "rgba(0,0,0,0.06)";
  const borderWidth = highlighted ? 2 : 1;
  const boxShadow = highlighted
    ? `0 0 0 2px rgba(194, 65, 12, ${highlightOpacity * 0.4}), 0 2px 8px rgba(0,0,0,0.04)`
    : "0 2px 8px rgba(0,0,0,0.04)";

  return (
    <div
      style={{
        display: "block",
        width: "100%",
        position: "relative",
        overflow: "hidden",
        borderRadius: 8,
        border: `${borderWidth}px solid ${borderColor}`,
        background: palette.subtle,
        transform: `scale(${scale})`,
        boxShadow,
      }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "5/3",
          width: "100%",
          overflow: "hidden",
        }}
      >
        <Img
          src={staticFile(`${slug}.png`)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top",
            display: "block",
          }}
        />
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.05) 45%, transparent 100%)",
          }}
        />
      </div>
      {/* Title bar — 8px padding, semibold Inter 13px */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "8px 10px",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: "#f5f5f5",
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
            fontFamily: interFont,
            lineHeight: 1.2,
          }}
        >
          {name}
        </p>
      </div>
    </div>
  );
};
