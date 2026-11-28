import React, { useRef, useEffect } from 'react';
import { prefersReducedMotion } from '../../lib/motion';

export default function ShiftingGradientMesh() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // Blobs whose hues and radii shift smoothly based on global page scroll
    const blobs = [
      { x: width * 0.2, y: height * 0.25, r: Math.min(width, height) * 0.48, vx: 0.2, vy: 0.14 },
      { x: width * 0.8, y: height * 0.38, r: Math.min(width, height) * 0.52, vx: -0.16, vy: 0.18 },
      { x: width * 0.5, y: height * 0.8, r: Math.min(width, height) * 0.58, vx: 0.12, vy: -0.16 },
    ];

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Compute normalized page scroll position (0 near hero -> 0.5 mid-page -> 1.0 footer)
      const docHeight = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      const scrollFraction = Math.min(1, Math.max(0, window.scrollY / docHeight));

      // Hue transition: neutral near hero -> vibrant emerald mid-page -> deeper forest green near footer
      let blob1Color, blob2Color, blob3Color;

      if (scrollFraction < 0.35) {
        // Hero: neutral warm cream & faint emerald
        blob1Color = 'rgba(13, 148, 103, 0.055)';
        blob2Color = 'rgba(0, 229, 153, 0.045)';
        blob3Color = 'rgba(235, 230, 218, 0.35)';
      } else if (scrollFraction < 0.75) {
        // Mid-page: vibrant soft emerald
        blob1Color = 'rgba(13, 148, 103, 0.085)';
        blob2Color = 'rgba(0, 229, 153, 0.075)';
        blob3Color = 'rgba(13, 148, 103, 0.05)';
      } else {
        // Near footer: deeper green
        blob1Color = 'rgba(10, 120, 84, 0.14)';
        blob2Color = 'rgba(0, 229, 153, 0.09)';
        blob3Color = 'rgba(13, 28, 21, 0.12)';
      }

      const colors = [blob1Color, blob2Color, blob3Color];

      blobs.forEach((b, idx) => {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x - b.r < 0 || b.x + b.r > width) b.vx *= -1;
        if (b.y - b.r < 0 || b.y + b.r > height) b.vy *= -1;

        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grad.addColorStop(0, colors[idx]);
        grad.addColorStop(1, 'rgba(247, 245, 240, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none -z-0 opacity-100 will-change-transform"
    />
  );
}
