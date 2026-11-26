import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useNavigation, PRODUCT_ROUTES } from '../../context/NavigationContext';

const promptList = [
  'Open on Sundays in downtown Manhattan',
  'Auto repair shops with 1000+ reviews',
  'Boutique hotels with rooftop pools',
  'Specialty coffee shops near subway stations'
];

export default function GMCustomAttributesSection() {
  const { navigate } = useNavigation();
  const [promptIndex, setPromptIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentFullText = promptList[promptIndex];
    let timer;

    if (!isDeleting) {
      if (displayText.length < currentFullText.length) {
        timer = setTimeout(() => {
          setDisplayText(currentFullText.slice(0, displayText.length + 1));
        }, 50);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2200);
      }
    } else {
      if (displayText.length > 0) {
        timer = setTimeout(() => {
          setDisplayText(currentFullText.slice(0, displayText.length - 1));
        }, 25);
      } else {
        setIsDeleting(false);
        setPromptIndex((prev) => (prev + 1) % promptList.length);
      }
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, promptIndex]);

  return (
    <section className="relative overflow-hidden py-16 md:py-24 my-12 border-y border-[#0d1c15]/08 bg-[#edf2ec]/40">
      {/* Decorative Geometric Floating Shapes */}
      <div className="absolute left-6 md:left-24 top-1/4 w-24 h-24 md:w-32 md:h-32 bg-[#00e599]/10 rounded-2xl pointer-events-none" />
      <div className="absolute left-2 md:left-12 top-1/2 w-20 h-20 md:w-28 md:h-28 bg-[#0d9467]/10 rounded-2xl pointer-events-none" />
      <div className="absolute right-2 md:right-16 top-1/4 w-20 h-20 md:w-28 md:h-28 bg-[#00e599]/10 rounded-2xl pointer-events-none" />
      <div className="absolute right-6 md:right-28 top-1/2 w-20 h-20 md:w-28 md:h-28 bg-[#0d9467]/10 rounded-2xl pointer-events-none" />

      {/* Center Content */}
      <div className="relative z-10 px-6 max-w-3xl mx-auto text-center">
        {/* Heading */}
        <h2 className="text-xl md:text-2xl font-display font-bold text-[#0d1c15] mb-6">
          Need custom place attributes?
        </h2>

        {/* Sparkle Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#edf2ec] text-[#0d9467] flex items-center justify-center border border-[#dbe5da]">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        {/* Animated Typewriter Prompt Field */}
        <div className="bg-white rounded-xl shadow-md px-6 py-4 mb-8 max-w-xl mx-auto flex items-center border border-[#0d1c15]/10">
          <span className="text-[#0d1c15] text-sm sm:text-base font-mono">
            {displayText}
          </span>
          <span className="inline-block w-0.5 h-5 bg-[#0d9467] ml-1 animate-pulse align-middle" />
        </div>

        {/* Subtitle */}
        <p className="text-2xl md:text-3xl font-display font-bold text-[#0d1c15] mb-8 leading-tight">
          We can synthesize bespoke POI criteria for your target markets.
        </p>

        {/* Request Demo Button */}
        <div>
          <button
            type="button"
            onClick={() => navigate(PRODUCT_ROUTES.SIGN_IN)}
            className="inline-flex items-center justify-center gap-2 bg-[#0d1c15] hover:bg-[#162b21] text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all cursor-pointer shadow-md"
          >
            <span>Request Custom Places Enrichment</span>
            <ArrowRight className="w-4 h-4 text-[#00e599]" />
          </button>
        </div>
      </div>
    </section>
  );
}
