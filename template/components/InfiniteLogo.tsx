'use client';

interface Props {
  /** 'rail' = 34px, 'header' = 22px, 'avatar' = 22px */
  size: 'rail' | 'header' | 'avatar';
  /** Show amber pulse dot in top-right corner */
  running?: boolean;
  onClick?: () => void;
  title?: string;
}

const SIZES = {
  rail:   { px: 34, radius: 7, font: 16 },
  header: { px: 22, radius: 5, font: 12 },
  avatar: { px: 22, radius: 5, font: 11 },
};

export default function InfiniteLogo({ size, running = false, onClick, title }: Props) {
  const { px, radius, font } = SIZES[size];
  const accent = '#c2410c';

  const box = (
    <div
      style={{
        width: px,
        height: px,
        borderRadius: radius,
        background: accent,
        color: '#fff',
        fontSize: font,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      ∞
      {running && (
        <div
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 8,
            height: 8,
            borderRadius: 999,
            background: '#fbbf24',
            animation: 'claw-pulse 1s ease-in-out infinite',
          }}
          aria-label="running"
        />
      )}
    </div>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        title={title}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {box}
      </button>
    );
  }

  return box;
}
