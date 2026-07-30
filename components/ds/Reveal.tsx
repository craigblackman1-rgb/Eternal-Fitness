"use client";

import { useEffect, useRef } from "react";

type RevealProps = {
  children: React.ReactNode;
  /** vertical offset to animate from (px) */
  y?: number;
  /** horizontal offset to animate from (px) */
  x?: number;
  duration?: number;
  delay?: number;
  /** stagger direct children instead of the wrapper itself */
  stagger?: number;
  /** ScrollTrigger start position */
  start?: string;
  className?: string;
  style?: React.CSSProperties;
  as?: "div" | "section" | "span";
};

/**
 * Shared scroll-reveal wrapper. Mirrors the homepage HomeMotion choreography
 * (fade + slide, power3.out, once) so inner pages animate identically.
 * No-ops under prefers-reduced-motion — content stays fully visible.
 */
export function Reveal({
  children,
  y = 40,
  x = 0,
  duration = 0.85,
  delay = 0,
  stagger,
  start = "top 85%",
  className,
  style,
  as = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ctx: { revert: () => void } | null = null;
    let cancelled = false;

    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (cancelled || !ref.current) return;
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        const target =
          stagger != null ? (ref.current!.children as unknown as HTMLElement[]) : ref.current!;
        gsap.from(target, {
          scrollTrigger: { trigger: ref.current!, start, once: true },
          y,
          x,
          opacity: 0,
          duration,
          delay,
          ease: "power3.out",
          clearProps: "transform",
          ...(stagger != null ? { stagger } : {}),
        });
      }, ref);
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [y, x, duration, delay, stagger, start]);

  const Tag = as;
  return (
    <Tag ref={ref as never} className={className} style={style}>
      {children}
    </Tag>
  );
}

export default Reveal;
