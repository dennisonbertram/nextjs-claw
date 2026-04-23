import React from "react";
import { palette } from "../palette";
import { InfiniteLogo } from "./InfiniteLogo";

interface SnapStepperProps {
  snap: "rail" | "default" | "wide";
}

const SnapStepper: React.FC<SnapStepperProps> = ({ snap }) => {
  const order = ["rail", "default", "wide"] as const;
  const sizes: Record<string, [number, number]> = {
    rail: [4, 12],
    default: [8, 12],
    wide: [12, 12],
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {order.map((s) => {
        const [w, h] = sizes[s];
        const active = snap === s;
        return (
          <div
            key={s}
            style={{
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: w,
                height: h,
                borderRadius: 2,
                background: active ? palette.accent : "transparent",
                border: `1.5px solid ${active ? palette.accent : palette.muted}`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

interface Props {
  snap?: "rail" | "default" | "wide";
  running?: boolean;
  children?: React.ReactNode;
}

export const ChatPanel: React.FC<Props> = ({
  snap = "default",
  running = false,
  children,
}) => {
  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        flexDirection: "column",
        background: palette.panel,
        borderLeft: `1px solid ${palette.line}`,
      }}
    >
      {/* Header */}
      <header
        style={{
          flexShrink: 0,
          padding: "14px 16px 0",
          borderBottom: `1px solid ${palette.line}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          {/* Left: logo + two-line title */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <InfiniteLogo size={22} running={running} />
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: -0.1,
                  color: palette.ink,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                the infinite app
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: palette.muted,
                  fontFamily:
                    "'JetBrains Mono', 'Courier New', ui-monospace, monospace",
                  marginTop: 1,
                }}
              >
                claude-opus-4-7 · {running ? "working" : "idle"}
              </div>
            </div>
          </div>

          {/* Right: pick button + snap stepper */}
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <div
              style={{
                width: 28,
                height: 28,
                color: palette.muted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M7 1v3M7 10v3M1 7h3M10 7h3" />
                <circle cx="7" cy="7" r="1.5" />
              </svg>
            </div>
            <SnapStepper snap={snap} />
          </div>
        </div>
      </header>

      {/* Content area */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          padding: "12px 16px",
        }}
      >
        {children}
      </div>

      {/* Composer placeholder */}
      <div
        style={{
          flexShrink: 0,
          padding: "8px 12px",
          borderTop: `1px solid ${palette.line}`,
        }}
      >
        <div
          style={{
            background: palette.bg,
            border: `1px solid ${palette.line}`,
            borderRadius: 8,
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: palette.muted,
              fontFamily: "Inter, sans-serif",
            }}
          >
            Describe what to build...
          </span>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: palette.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
            >
              <path d="M6 2v8M2 6l4-4 4 4" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
