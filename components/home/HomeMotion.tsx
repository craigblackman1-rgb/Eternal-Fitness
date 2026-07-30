"use client";

import { useEffect } from "react";

/**
 * GSAP scroll-reveal + hero entrance animations for the homepage.
 * Ported from the OpenDesign concept. Targets marker classes in the markup.
 * No-ops under prefers-reduced-motion.
 */
const HomeMotion = () => {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ctx: { revert: () => void } | null = null;
    let cancelled = false;

    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        // Hero clip-reveal (.hw has overflow:hidden)
        gsap.from(".hl", { y: "108%", duration: 1.05, stagger: 0.18, ease: "power4.out", delay: 0.15 });
        gsap.from("#htag", { y: 14, opacity: 0, duration: 0.65, ease: "power3.out", delay: 0.08 });
        gsap.from("#hloc", { y: 18, opacity: 0, duration: 0.75, ease: "power3.out", delay: 0.7 });
        gsap.from("#hsub", { y: 14, opacity: 0, duration: 0.7, ease: "power2.out", delay: 0.86 });
        gsap.from("#hbtns", { y: 14, opacity: 0, duration: 0.65, ease: "power2.out", delay: 1.0 });
        gsap.from("#hcanvas", { opacity: 0, scale: 0.85, duration: 1.3, delay: 0.3, ease: "power3.out" });
        gsap.from("#hbadge", { opacity: 0, y: 20, duration: 0.75, delay: 1.05, ease: "power2.out" });

        const sr = (sel: string, y = 44, dur = 0.85, delay = 0) => {
          gsap.utils.toArray<HTMLElement>(sel).forEach((el) => {
            gsap.from(el, {
              scrollTrigger: { trigger: el, start: "top 87%", once: true },
              y, opacity: 0, duration: dur, ease: "power3.out", delay, clearProps: "transform",
            });
          });
        };
        sr(".stag", 16, 0.6);
        sr(".D", 38, 0.9);
        sr(".L", 24, 0.8, 0.06);
        sr(".ctac h2", 36, 0.9);
        sr(".ctac p", 22, 0.75, 0.1);
        sr(".ctabtns", 16, 0.65, 0.2);

        gsap.utils.toArray<HTMLElement>(".wic").forEach((el) => {
          gsap.from(el, { scrollTrigger: { trigger: el, start: "top 82%", once: true }, x: -60, opacity: 0, duration: 1.0, ease: "power3.out", clearProps: "transform" });
        });
        gsap.utils.toArray<HTMLElement>(".wf").forEach((el, i) => {
          gsap.from(el, { scrollTrigger: { trigger: el, start: "top 90%", once: true }, x: 28, opacity: 0, duration: 0.7, delay: i * 0.07, ease: "power2.out", clearProps: "transform" });
        });

        [".who-g", ".aq-g", ".spec-g"].forEach((s) => {
          gsap.utils.toArray<HTMLElement>(s).forEach((g) => {
            gsap.from(g.children, { scrollTrigger: { trigger: g, start: "top 82%", once: true }, y: 58, opacity: 0, stagger: 0.13, duration: 0.9, ease: "power3.out", clearProps: "transform" });
          });
        });

        gsap.utils.toArray<HTMLElement>(".step").forEach((el, i) => {
          gsap.from(el, { scrollTrigger: { trigger: el, start: "top 84%", once: true }, y: 48, opacity: 0, duration: 0.85, delay: i * 0.06, ease: "power3.out", clearProps: "transform" });
        });

        sr(".tmark", 28, 0.9);
        sr(".tquote", 28, 0.85);
        sr(".tauth", 16, 0.7);
        sr(".tsec", 24, 0.8, 0.05);
      });
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return null;
};

export default HomeMotion;
