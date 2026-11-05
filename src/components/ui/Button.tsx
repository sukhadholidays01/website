import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-brand-teal bg-brand-teal text-brand-navy hover:border-brand-teal-hover hover:bg-brand-teal-hover",
  secondary:
    "border border-border bg-white text-brand-navy hover:border-brand-teal/50 hover:bg-brand-light-teal",
  ghost:
    "border border-transparent bg-transparent text-brand-blue hover:bg-brand-light-teal hover:text-brand-navy",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3.5 py-2 text-sm",
  md: "min-h-11 px-4.5 py-2.5 text-sm",
  lg: "min-h-12 px-5 py-3 text-sm",
};

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: ButtonStyleOptions = {}): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-[background-color,border-color,color,transform] duration-200 motion-safe:hover:-translate-y-0.5 [&>svg]:transition-transform motion-safe:hover:[&>svg]:translate-x-0.5 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
}
