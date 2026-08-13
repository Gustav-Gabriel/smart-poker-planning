import type { IconProps } from "./icon.types";

export function ChevronLeftIcon({
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
        d="M12.71 4.29a1 1 0 0 1 0 1.42L8.41 10l4.3 4.29a1 1 0 1 1-1.42 1.42l-5-5a1 1 0 0 1 0-1.42l5-5a1 1 0 0 1 1.42 0Z"
        fill={iconColor}
      />
    </svg>
  );
}
