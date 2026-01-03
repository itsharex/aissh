import React from 'react';

interface CyberPanelProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  variant?: 'base' | 'panel' | 'obsidian';
}

export const CyberPanel: React.FC<CyberPanelProps> = ({ 
  children, 
  className = '', 
  glow = false,
  variant = 'panel'
}) => {
  const bgMap = {
    base: 'bg-sci-base/80',
    panel: 'bg-sci-panel/80',
    obsidian: 'bg-sci-obsidian/80'
  };

  return (
    <div className={`
      relative ${bgMap[variant]} backdrop-blur-md border border-white/5 
      ${glow ? 'shadow-[0_0_15px_rgba(0,243,255,0.05)] border-sci-cyan/20' : ''}
      ${className}
    `}>
      {/* 装饰性角落 */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-sci-cyan/30"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-sci-cyan/30"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-sci-cyan/30"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-sci-cyan/30"></div>
      
      {children}
    </div>
  );
};
