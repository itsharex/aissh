import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface CyberPanelProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  variant?: 'base' | 'panel' | 'obsidian';
  noAnimation?: boolean;
}

export const CyberPanel: React.FC<CyberPanelProps> = ({ 
  children, 
  className = '', 
  glow = false,
  variant = 'panel',
  noAnimation = false,
  ...props
}) => {
  const bgMap = {
    base: 'bg-sci-base/80',
    panel: 'bg-sci-panel/80',
    obsidian: 'bg-sci-obsidian/80'
  };

  const Component = noAnimation ? 'div' : motion.div;

  return (
    // @ts-ignore - Dynamic component type issue with framer-motion
    <Component 
      className={`
        relative ${bgMap[variant]} backdrop-blur-md border border-white/5 
        ${glow ? 'shadow-[0_0_15px_rgba(0,243,255,0.05)] border-sci-cyan/20' : ''}
        ${className}
      `}
      initial={!noAnimation ? { opacity: 0, y: 10 } : undefined}
      animate={!noAnimation ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {/* 装饰性角落 - Animated */}
      <motion.div 
        className="absolute top-0 left-0 w-2 h-2 border-t border-l border-sci-cyan/30"
        whileHover={{ scale: 1.5, borderColor: '#00f3ff' }}
      />
      <motion.div 
        className="absolute top-0 right-0 w-2 h-2 border-t border-r border-sci-cyan/30"
        whileHover={{ scale: 1.5, borderColor: '#00f3ff' }}
      />
      <motion.div 
        className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-sci-cyan/30"
        whileHover={{ scale: 1.5, borderColor: '#00f3ff' }}
      />
      <motion.div 
        className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-sci-cyan/30"
        whileHover={{ scale: 1.5, borderColor: '#00f3ff' }}
      />
      
      {children}
    </Component>
  );
};
