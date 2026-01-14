import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, Cpu, Zap, Activity } from 'lucide-react';
import { GlitchText } from '../common/AnimatedText';

export const AIEmptyState: React.FC<{ onAction?: (text: string) => void }> = ({ onAction }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Holographic Wave Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = canvas.parentElement?.clientWidth || 300;
    let height = canvas.height = 200;
    let time = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 2;
      
      // Draw 3 overlapping sine waves
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const color = i === 0 ? 'rgba(0, 243, 255, 0.5)' : i === 1 ? 'rgba(188, 19, 254, 0.3)' : 'rgba(255, 255, 255, 0.1)';
        ctx.strokeStyle = color;
        
        for (let x = 0; x < width; x++) {
          const y = height / 2 + Math.sin(x * 0.02 + time + i) * (20 + i * 10) * Math.sin(time * 0.5);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      
      time += 0.05;
      requestAnimationFrame(draw);
    };
    
    const animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, []);

  const suggestions = [
    { icon: <Cpu size={14} />, text: "检查服务器 CPU 负载", cmd: "top -b -n 1 | head -n 10" },
    { icon: <Activity size={14} />, text: "查看网络连接状态", cmd: "netstat -tuln" },
    { icon: <Zap size={14} />, text: "分析最近的系统日志", cmd: "tail -n 50 /var/log/syslog" },
    { icon: <BrainCircuit size={14} />, text: "检测潜在的安全风险", cmd: "last -n 10" },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
      
      {/* Central Hologram Core */}
      <div className="relative mb-8 group cursor-pointer">
        <div className="absolute inset-0 bg-sci-cyan/20 blur-xl rounded-full animate-pulse"></div>
        <motion.div 
          animate={{ 
            rotateY: [0, 180, 360],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="relative w-24 h-24 border border-sci-cyan/30 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm shadow-[0_0_30px_rgba(0,243,255,0.2)]"
        >
          <div className="absolute inset-2 border border-sci-violet/30 rounded-full border-dashed animate-[spin_20s_linear_infinite]"></div>
          <BrainCircuit size={40} className="text-sci-cyan drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]" />
        </motion.div>
        
        {/* Floating Particles */}
        <div className="absolute -top-10 -left-10 w-40 h-40 pointer-events-none">
           <motion.div 
             className="absolute top-1/2 left-1/2 w-1 h-1 bg-sci-cyan rounded-full"
             animate={{ x: [0, 50, -50, 0], y: [0, -50, 50, 0], opacity: [0, 1, 0] }}
             transition={{ duration: 3, repeat: Infinity }}
           />
           <motion.div 
             className="absolute top-1/2 left-1/2 w-1 h-1 bg-sci-violet rounded-full"
             animate={{ x: [0, -30, 30, 0], y: [0, 40, -40, 0], opacity: [0, 1, 0] }}
             transition={{ duration: 4, repeat: Infinity, delay: 1 }}
           />
        </div>
      </div>

      {/* Holographic Wave Canvas */}
      <canvas ref={canvasRef} className="absolute top-1/2 left-0 w-full h-32 -translate-y-1/2 pointer-events-none opacity-40" />

      {/* Text Content */}
      <div className="text-center relative z-10 mb-8">
        <h3 className="text-xl font-black font-sci text-sci-text uppercase tracking-[0.2em] mb-2">
          <GlitchText text="NEURAL LINK READY" />
        </h3>
        <p className="text-[10px] text-sci-cyan/60 font-mono tracking-widest uppercase">
          Waiting for command input...
        </p>
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-1 gap-3 w-full max-w-xs relative z-10">
        {suggestions.map((item, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onAction?.(item.text)}
            className="flex items-center gap-3 p-3 bg-sci-panel/40 border border-white/5 hover:border-sci-cyan/40 hover:bg-sci-cyan/5 transition-all group clip-corner text-left"
          >
            <div className="p-1.5 bg-sci-cyan/10 text-sci-cyan rounded-sm group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(0,243,255,0.1)]">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold font-sci text-sci-text uppercase tracking-wider group-hover:text-sci-cyan transition-colors">{item.text}</div>
              <div className="text-[9px] font-mono text-white/30 truncate group-hover:text-sci-cyan/40">
                &gt; {item.cmd}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
      
      {/* Decorative Footer */}
      <div className="absolute bottom-4 left-0 w-full flex justify-between px-6 text-[9px] font-mono text-sci-dim uppercase opacity-50">
        <span>AI-CORE: ONLINE</span>
        <span>LATENCY: 12ms</span>
      </div>
    </div>
  );
};
