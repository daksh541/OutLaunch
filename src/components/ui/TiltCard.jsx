import React, { useRef, useEffect } from 'react';
import { gsap, prefersReducedMotion, isTouchDevice } from '../../lib/motion';

export default function TiltCard({
  children,
  className = '',
  maxTilt = 4,
  ...props
}) {
  const cardRef = useRef(null);
  const spotlightRef = useRef(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || prefersReducedMotion() || isTouchDevice()) return;

    let rotXTo = gsap.quickTo(card, 'rotationX', { duration: 0.4, ease: 'power2.out' });
    let rotYTo = gsap.quickTo(card, 'rotationY', { duration: 0.4, ease: 'power2.out' });

    const handleMouseMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const normX = (x / rect.width - 0.5) * 2;
      const normY = (y / rect.height - 0.5) * 2;

      rotXTo(-normY * maxTilt);
      rotYTo(normX * maxTilt);

      if (spotlightRef.current) {
        spotlightRef.current.style.opacity = '1';
        spotlightRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      }
    };

    const handleMouseLeave = () => {
      rotXTo(0);
      rotYTo(0);
      if (spotlightRef.current) {
        spotlightRef.current.style.opacity = '0';
      }
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [maxTilt]);

  return (
    <div
      ref={cardRef}
      style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      <div
        ref={spotlightRef}
        aria-hidden="true"
        className="pointer-events-none absolute w-64 h-64 rounded-full bg-[radial-gradient(circle,rgba(0,229,153,0.12)_0%,transparent_70%)] opacity-0 transition-opacity duration-300 z-10"
      />
      {children}
    </div>
  );
}
