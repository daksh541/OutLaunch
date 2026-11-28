import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const MOTION_TOKENS = {
  easeOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
  easeOutCubic: 'power3.out',
  easeOutQuart: 'power4.out',
  durations: {
    micro: 0.15,
    short: 0.25,
    medium: 0.4,
    long: 0.7,
  },
  stagger: 0.08,
};

export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Circular clip-path transition expanding from an origin element
 * Uses native View Transitions API when available, falling back to GSAP.
 */
export function triggerCircularTransition(originElement, navigateCallback) {
  if (prefersReducedMotion() || typeof window === 'undefined') {
    navigateCallback();
    return;
  }

  const rect = originElement?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
  const maxRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  if (typeof document !== 'undefined' && typeof document.startViewTransition === 'function') {
    const transition = document.startViewTransition(() => {
      navigateCallback();
    });
    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${maxRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 650,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            pseudoElement: '::view-transition-new(root)',
          }
        );
      })
      .catch(() => {
        navigateCallback();
      });
  } else {
    // GSAP Circular Overlay Fallback
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.backgroundColor = '#0d1c15';
    overlay.style.zIndex = '999999';
    overlay.style.pointerEvents = 'none';
    overlay.style.clipPath = `circle(0px at ${x}px ${y}px)`;
    document.body.appendChild(overlay);

    gsap.to(overlay, {
      clipPath: `circle(${maxRadius}px at ${x}px ${y}px)`,
      duration: 0.5,
      ease: 'power3.out',
      onComplete: () => {
        navigateCallback();
        gsap.to(overlay, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out',
          onComplete: () => {
            overlay.remove();
          },
        });
      },
    });
  }
}

export { gsap, ScrollTrigger };
