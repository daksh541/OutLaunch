import React, { useEffect, useRef } from 'react';
import { prefersReducedMotion, isTouchDevice } from '../../lib/motion';

export default function AnalysisSpotlightCursor() {
  const glowRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion() || isTouchDevice()) return;
    const glow = glowRef.current;
    if (!glow) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let rafId;

    const handlePointerMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      glow.style.opacity = '1';
    };

    const handlePointerLeave = () => {
      glow.style.opacity = '0';
    };

    const update = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      glow.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      rafId = requestAnimationFrame(update);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerleave', handlePointerLeave);
    rafId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', handlePointerLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 w-96 h-96 rounded-full bg-[radial-gradient(circle,rgba(0,229,153,0.08)_0%,rgba(13,148,103,0.02)_40%,transparent_70%)] opacity-0 transition-opacity duration-300 z-10 will-change-transform"
    />
  );
}
