export interface IconProps {
  className?: string;
  height?: string | number;
  width?: string | number;
  /** Icon color (CSS color). Falls back to `fill`, then `currentColor`. */
  color?: string;
  /** Alias for `color` (SVG fill convention). */
  fill?: string;
}
