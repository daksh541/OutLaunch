import React, { useRef, useEffect } from 'react';
import { gsap, prefersReducedMotion, isTouchDevice } from '../../lib/motion';

export default function MagneticButton({
  children,
  className = '',
  onClick = null,
  disabled = false,
  type = 'button',
  strength = 14,
  ...props
}) {
  const btnRef = useRef(null);

  useEffect(() => {
    const el = btnRef.current;
    if (!el || prefersReducedMotion() || isTouchDevice()) return;

    let xTo = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
    let yTo = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });

    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distanceX = e.clientX - centerX;
      const distanceY = e.clientY - centerY;

      xTo((distanceX / (rect.width / 2)) * strength);
      yTo((distanceY / (rect.height / 2)) * strength);
    };

    const handleMouseLeave = () => {
      xTo(0);
      yTo(0);
    };

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [strength]);

  const handleClick = (e) => {
    if (disabled) return;

    // Ripple effect
    const el = btnRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height) * 2;
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      ripple.className = 'ripple-effect';
      el.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }

    if (onClick) onClick(e);
  };

  return (
    <button
      ref={btnRef}
      type={type}
      disabled={disabled}
      onClick={handleClick}
      className={`relative overflow-hidden transition-shadow duration-200 active:scale-[0.98] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
