import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function buttonClassName(
  variant: ButtonProps["variant"] = "primary",
): string {
  return `button button--${variant}`;
}

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${buttonClassName(variant)} ${className}`.trim()}
      {...props}
    />
  );
}
