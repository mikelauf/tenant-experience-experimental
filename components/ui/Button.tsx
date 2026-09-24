import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon, type AnyIcon } from "./Icon";

type Variant = "primary" | "accent" | "outline" | "ghost" | "light" | "glass";
type Size = "sm" | "md" | "lg";

const base =
  "group/btn relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium tracking-[-0.01em] transition-[background-color,color,box-shadow,transform] duration-300 ease-[var(--ease-out-quart)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink-2",
  accent: "bg-redwood text-paper hover:bg-redwood-deep",
  outline: "text-current shadow-[inset_0_0_0_1px_currentColor] hover:bg-ink/5 [.theme-night_&]:hover:bg-white/10",
  ghost: "text-current hover:bg-ink/6 [.theme-night_&]:hover:bg-white/10",
  light: "bg-paper text-ink hover:bg-white",
  glass: "bg-white/14 text-white backdrop-blur-md shadow-[inset_0_0_0_1px_rgb(255_255_255/0.22)] hover:bg-white/24",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[0.875rem]",
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-14 px-7 text-base",
};

type Common = {
  variant?: Variant;
  size?: Size;
  icon?: AnyIcon;
  iconLeft?: AnyIcon;
  className?: string;
  children: React.ReactNode;
};

function Inner({ icon, iconLeft, children }: Pick<Common, "icon" | "iconLeft" | "children">) {
  return (
    <>
      {iconLeft && <Icon name={iconLeft} size={18} />}
      <span>{children}</span>
      {icon && <Icon name={icon} size={18} className="transition-transform duration-300 ease-[var(--ease-out-quart)] group-hover/btn:translate-x-0.5" />}
    </>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconLeft,
  className,
  children,
  ...rest
}: Common & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      <Inner icon={icon} iconLeft={iconLeft}>
        {children}
      </Inner>
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  icon,
  iconLeft,
  className,
  children,
  ...rest
}: Common & { href: string } & Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      <Inner icon={icon} iconLeft={iconLeft}>
        {children}
      </Inner>
    </Link>
  );
}

/** Round icon-only button */
export function IconButton({
  icon,
  label,
  className,
  variant = "ghost",
  size = 44,
  ...rest
}: { icon: AnyIcon; label: string; variant?: Variant; size?: number } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button aria-label={label} title={label} className={cn(base, variants[variant], "shrink-0 p-0", className)} style={{ width: size, height: size }} {...rest}>
      <Icon name={icon} size={Math.round(size * 0.45)} />
    </button>
  );
}
