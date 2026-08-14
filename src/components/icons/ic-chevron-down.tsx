import type { IconProps } from "./icon.types";

export function ChevronDownIcon({
  className,
  height = 20,
  width = 20,
  color,
  fill,
}: IconProps) {
  const iconColor = color ?? fill ?? "currentColor";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      width={width}
      height={height}
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", background: "transparent" }}
    >
      <path
        d="M4.29 7.29a1 1 0 0 1 1.42 0L10 11.59l4.29-4.3a1 1 0 1 1 1.42 1.42l-5 5a1 1 0 0 1-1.42 0l-5-5a1 1 0 0 1 0-1.42Z"
        fill={iconColor}
      />
    </svg>
  );
}
