"use client";

import { useEffect, useRef } from "react";

export function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" },
    );

    // Observe all reveal elements within the container
    const elements = el.querySelectorAll(
      ".reveal-up, .reveal-left, .reveal-right",
    );
    elements.forEach((elem) => observer.observe(elem));

    // Also observe the container itself if it has a reveal class
    if (
      el.classList.contains("reveal-up") ||
      el.classList.contains("reveal-left") ||
      el.classList.contains("reveal-right")
    ) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return ref;
}
