import React, { useState, useRef, useEffect } from 'react';
import { LayoutGrid, ChevronDown, Sparkles, Code2, Globe, MapPin, Compass } from 'lucide-react';
import { useNavigation, PRODUCT_ROUTES } from '../../context/NavigationContext';
import { triggerCircularTransition } from '../../lib/motion';

const products = [
  {
    id: 'outreach',
    label: 'Outreach Agent',
    description: 'AI agents that find and email your buyers',
    path: PRODUCT_ROUTES.OUTREACH,
    icon: Sparkles,
  },
  {
    id: 'api',
    label: 'API',
    description: 'REST API for company and people data',
    path: PRODUCT_ROUTES.API,
    icon: Code2,
  },
  {
    id: 'database',
    label: 'Database',
    description: 'The largest B2B company database',
    path: PRODUCT_ROUTES.DATABASE,
    icon: Globe,
  },
  {
    id: 'gm',
    label: 'Global Places Dataset',
    description: '200M+ local businesses, stores & commercial venues',
    path: PRODUCT_ROUTES.GM,
    icon: MapPin,
  },
  {
    id: 'explorer',
    label: 'Explorer',
    description: 'Explore and filter the company graph',
    path: PRODUCT_ROUTES.EXPLORER,
    icon: Compass,
  },
];

export default function ProductsDropdown({ theme = 'light' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { currentProduct, navigate } = useNavigation();

  const isDark = theme === 'dark';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown when user scrolls
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => {
      setIsOpen(false);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isOpen]);

  const handleSelectProduct = (item, targetEl) => {
    setIsOpen(false);
    if (item.id === 'explorer') {
      triggerCircularTransition(targetEl, () => navigate(item.path));
    } else {
      navigate(item.path);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Products Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 transition-colors duration-200 cursor-pointer text-sm md:text-base font-normal py-2 px-3 rounded-lg ${
          isDark
            ? 'text-white/90 hover:text-white hover:bg-white/[0.06]'
            : 'text-foreground hover:text-foreground/80 hover:bg-black/[0.04]'
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
        <span>Products</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Menu Card */}
      {isOpen && (
        <div
          className={`absolute top-full left-0 mt-2 w-80 md:w-88 rounded-2xl p-2 z-50 backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2 ${
            isDark
              ? 'bg-[#111414]/95 border border-white/[0.12] text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
              : 'bg-white/95 border border-[#0d1c15]/10 text-foreground shadow-[0_16px_40px_rgba(13,28,21,0.12)]'
          }`}
        >
          <div className="space-y-1">
            {products.map((item, idx) => {
              const Icon = item.icon;
              const isActive = currentProduct === item.id;

              return (
                <a
                  key={item.id}
                  href={item.path}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  onClick={(e) => {
                    e.preventDefault();
                    handleSelectProduct(item, e.currentTarget);
                  }}
                  className={`group flex items-start gap-3.5 p-3 rounded-xl transition-colors cursor-pointer ${
                    isActive
                      ? isDark
                        ? 'bg-white/[0.08]'
                        : 'bg-black/[0.05]'
                      : isDark
                      ? 'hover:bg-white/[0.05]'
                      : 'hover:bg-black/[0.03]'
                  }`}
                >
                  {/* Left Icon */}
                  <div
                    className={`mt-0.5 p-2 rounded-lg shrink-0 transition-colors ${
                      isDark
                        ? 'bg-white/[0.04] text-[#9ca3af] group-hover:text-white'
                        : 'bg-black/[0.04] text-muted-foreground group-hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Title & Subtitle */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-semibold text-sm leading-tight transition-colors ${
                        isDark ? 'text-white' : 'text-foreground'
                      }`}
                    >
                      {item.label}
                    </div>
                    <div
                      className={`text-xs mt-1 leading-snug line-clamp-2 ${
                        isDark ? 'text-[#9ca3af]' : 'text-muted-foreground'
                      }`}
                    >
                      {item.description}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
