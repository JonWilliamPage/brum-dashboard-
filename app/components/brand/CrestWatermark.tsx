import type { CSSProperties } from 'react';
import BullAscii from '../BullAscii';

interface CrestWatermarkProps {
  width?: number;
  opacity?: number;
  /** Glyph colour — must be a real colour, canvas can't read CSS vars. Defaults to light, for dark/navy panels. */
  textColor?: string;
  /** Positioning overrides (top/right/bottom/left/transform). Parent must be position:relative. */
  style?: CSSProperties;
}

/**
 * Faded ASCII watermark — the Ozzy bull, static-rendered as ASCII art, bled behind a panel.
 * Part of the Ozzy brand chrome. Parent must be position:relative + overflow:hidden.
 */
export default function CrestWatermark({
  width = 300,
  opacity = 0.05,
  textColor = '#f5f3ee',
  style,
}: CrestWatermarkProps) {
  return (
    <BullAscii
      animate={false}
      textColor={textColor}
      displayWidth={width}
      style={{ position: 'absolute', pointerEvents: 'none', opacity, margin: 0, ...style }}
    />
  );
}
