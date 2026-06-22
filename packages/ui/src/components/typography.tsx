import type { HTMLAttributes } from "react";
import { cn } from "@workspace/ui/lib/utils";

// Heading scale — responsive sizing is baked in via Tailwind breakpoint steps
// (md:/lg:/xl:) so "scale with screen width" is encoded in the component, not
// re-typed per page. `className` is merged last so a consumer can still override.
// See docs/10-design-system.md.

export function H1({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "scroll-m-20 text-balance font-display font-black tracking-tight text-3xl md:text-4xl lg:text-5xl xl:text-6xl",
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

export function H2({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        // `border-b pb-2` is the doc/article style; app section headings can
        // drop it with `className="border-0 pb-0"`.
        "scroll-m-20 font-display font-black tracking-tight first:mt-0 text-2xl md:text-3xl lg:text-4xl",
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

export function H3({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "scroll-m-20 font-semibold tracking-tight text-xl md:text-2xl lg:text-3xl",
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function H4({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h4
      className={cn(
        "scroll-m-20 font-semibold tracking-tight text-lg md:text-xl lg:text-2xl",
        className,
      )}
      {...props}
    >
      {children}
    </h4>
  );
}

export function H5({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={cn(
        "scroll-m-20 font-semibold tracking-tight text-base md:text-lg lg:text-xl",
        className,
      )}
      {...props}
    >
      {children}
    </h5>
  );
}

export function H6({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h6
      className={cn(
        "scroll-m-20 font-semibold tracking-tight text-sm md:text-base lg:text-lg",
        className,
      )}
      {...props}
    >
      {children}
    </h6>
  );
}

export function P({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("leading-7", className)} {...props}>
      {children}
    </p>
  );
}

export function Blockquote({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <blockquote
      className={cn("mt-6 border-s-2 ps-6 italic", className)}
      {...props}
    >
      {children}
    </blockquote>
  );
}

export function InlineCode({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <code
      className={cn(
        "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono font-semibold text-sm",
        className,
      )}
      {...props}
    >
      {children}
    </code>
  );
}

export function Lead({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-muted-foreground text-xl", className)} {...props}>
      {children}
    </p>
  );
}

export function Large({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("font-semibold text-lg", className)} {...props}>
      {children}
    </div>
  );
}

export function Small({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <small
      className={cn("font-medium text-sm leading-none", className)}
      {...props}
    >
      {children}
    </small>
  );
}

export function Muted({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-muted-foreground text-sm", className)} {...props}>
      {children}
    </p>
  );
}
