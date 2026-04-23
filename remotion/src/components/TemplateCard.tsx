import React from "react";
import { Img, staticFile } from "remotion";
import { palette } from "../palette";

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
  const borderColor = highlighted
    ? palette.accent
    : palette.line;
  const borderWidth = highlighted ? 2 : 1;
  const shadowAlpha = Math.round(highlightOpacity * 80);
  const boxShadow = highlighted
    ? `0 0 0 2px rgba(194, 65, 12, ${highlightOpacity * 0.4})`
    : "none";

  return (
    <div
      style={{
        display: "block",
        width: "100%",
        position: "relative",
        overflow: "hidden",
        borderRadius: 6,
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
              "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.08) 50%, transparent 100%)",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          bottom: 0,
          padding: 8,
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 600,
            color: "#f5f5f5",
            textShadow: "0 1px 3px rgba(0,0,0,0.5)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {name}
        </p>
      </div>
    </div>
  );
};
