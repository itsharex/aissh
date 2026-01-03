
import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'error' | 'success' | 'sci-cyan' | 'sci-violet';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  glow?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading = false,
  glow = false,
  className = '',
  ...props 
}) => {
  const sizeMap = {
    xs: 'px-2 py-1 text-[9px]',
    sm: 'px-3 py-1.5 text-[10px]',
    md: 'px-5 py-2 text-xs',
    lg: 'px-8 py-3 text-sm'
  };

  const variantMap = {
    primary: 'bg-sci-cyan/10 border-sci-cyan/50 text-sci-cyan hover:bg-sci-cyan hover:text-black shadow-[0_0_15px_rgba(0,243,255,0.1)]',
    secondary: 'bg-sci-violet/10 border-sci-violet/50 text-sci-violet hover:bg-sci-violet hover:text-black shadow-[0_0_15px_rgba(139,92,246,0.1)]',
    accent: 'bg-sci-green/10 border-sci-green/50 text-sci-green hover:bg-sci-green hover:text-black',
    ghost: 'bg-transparent border-transparent text-sci-dim hover:text-sci-text hover:bg-white/5',
    error: 'bg-sci-red/10 border-sci-red/50 text-sci-red hover:bg-sci-red hover:text-black shadow-[0_0_15px_rgba(255,42,0,0.1)]',
    success: 'bg-sci-green/10 border-sci-green/50 text-sci-green hover:bg-sci-green hover:text-black',
    'sci-cyan': 'bg-sci-cyan/10 border-sci-cyan/50 text-sci-cyan hover:bg-sci-cyan hover:text-black shadow-[0_0_15px_rgba(0,243,255,0.1)]',
    'sci-violet': 'bg-sci-violet/10 border-sci-violet/50 text-sci-violet hover:bg-sci-violet hover:text-black shadow-[0_0_15px_rgba(139,92,246,0.1)]',
  };

  return (
    <button 
      className={`
        relative inline-flex items-center justify-center gap-2 font-sci font-bold uppercase tracking-[0.15em] 
        transition-all duration-300 border clip-corner disabled:opacity-30 disabled:pointer-events-none
        ${sizeMap[size]} 
        ${variantMap[variant as keyof typeof variantMap] || variantMap.primary}
        ${glow ? 'animate-pulse' : ''}
        ${className}
      `}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      <span className="relative z-10">{children}</span>
      
      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
    </button>
  );
};
