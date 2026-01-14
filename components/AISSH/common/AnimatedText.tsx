import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface AnimatedTextProps {
  text: string;
  className?: string;
  speed?: number;
  onComplete?: () => void;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({ 
  text, 
  className = '', 
  speed = 30,
  onComplete 
}) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        setDisplayedText(text.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span className={className}>
      {displayedText}
      <span className="inline-block w-2 h-4 bg-sci-cyan ml-1 animate-pulse align-middle" />
    </span>
  );
};

export const GlitchText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  return (
    <div className={`relative inline-block group ${className}`}>
      <span className="relative z-10">{text}</span>
      <span className="absolute top-0 left-0 -z-10 text-sci-red opacity-70 animate-glitch translate-x-[2px] group-hover:translate-x-[3px]">
        {text}
      </span>
      <span className="absolute top-0 left-0 -z-10 text-sci-cyan opacity-70 animate-glitch translate-x-[-2px] animation-delay-100 group-hover:translate-x-[-3px]">
        {text}
      </span>
    </div>
  );
};
