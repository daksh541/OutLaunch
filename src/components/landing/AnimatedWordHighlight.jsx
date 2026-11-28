import React, { useRef, useEffect } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '../../lib/motion';

export default function AnimatedWordHighlight({ text, className = '', entrance = false }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion() || !containerRef.current) return;

    const words = containerRef.current.querySelectorAll('.word-highlight');
    if (!words.length) return;

    const ctx = gsap.context(() => {
      if (entrance) {
        // Per-word entrance: translateY + blur to sharp + fade
        gsap.fromTo(
          words,
          { y: 22, filter: 'blur(6px)', opacity: 0 },
          {
            y: 0,
            filter: 'blur(0px)',
            opacity: 1,
            duration: 0.7,
            stagger: 0.035,
            ease: 'power3.out',
          }
        );
      } else {
        gsap.fromTo(
          words,
          { opacity: 0.25 },
          {
            opacity: 1,
            stagger: 0.05,
            ease: 'power1.out',
            scrollTrigger: {
              trigger: containerRef.current,
              start: 'top 80%',
              end: 'bottom 40%',
              scrub: 0.6,
            },
          }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, [text, entrance]);

  const words = text.split(' ');

  return (
    <span ref={containerRef} className={className}>
      {words.map((word, idx) => (
        <span key={idx} className="word-highlight inline-block transition-opacity duration-150 mr-[0.25em]">
          {word}
        </span>
      ))}
    </span>
  );
}
