import React, { useRef, useEffect } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '../../lib/motion';

export default function AnimatedCounter({
  targetValue,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 1.6,
  className = '',
}) {
  const spanRef = useRef(null);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      el.textContent = `${prefix}${targetValue.toFixed(decimals)}${suffix}`;
      return;
    }

    const obj = { val: 0 };
    const ctx = gsap.context(() => {
      gsap.to(obj, {
        val: targetValue,
        duration,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 90%',
          once: true,
        },
        onUpdate: () => {
          if (el) {
            el.textContent = `${prefix}${decimals > 0 ? obj.val.toFixed(decimals) : Math.round(obj.val).toLocaleString()}${suffix}`;
          }
        },
      });
    }, el);

    return () => ctx.revert();
  }, [targetValue, prefix, suffix, decimals, duration]);

  return (
    <span ref={spanRef} className={`tabular-nums font-mono ${className}`}>
      {prefix}0{suffix}
    </span>
  );
}
