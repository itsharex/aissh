import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Terminal, ShieldAlert, WifiOff, Activity } from 'lucide-react';
import { GlitchText } from '../common/AnimatedText';

const MatrixRain: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const columns = Math.floor(width / 20);
    const drops: number[] = new Array(columns).fill(1);
    
    // Katakana + Latin + Numbers
    const chars = 'ｱｲｳｴオｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ1234567890ABCDEF';

    const draw = () => {
      // Semi-transparent black to create trail effect
      ctx.fillStyle = 'rgba(5, 5, 5, 0.05)';
      ctx.fillRect(0, 0, width, height);

      ctx.font = '15px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        
        // Random colors: primarily cyan, sometimes violet or white
        const random = Math.random();
        if (random > 0.98) ctx.fillStyle = '#fff'; // Sparkle
        else if (random > 0.9) ctx.fillStyle = '#bc13fe'; // Violet
        else ctx.fillStyle = '#00f3ff'; // Cyan

        ctx.fillText(text, i * 20, drops[i] * 20);

        if (drops[i] * 20 > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" />;
};

const BootSequence: React.FC = () => {
  const [lines, setLines] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bootLogs = [
      "INITIALIZING NEURAL INTERFACE...",
      "LOADING KERNEL MODULES... [OK]",
      "MOUNTING VIRTUAL FILESYSTEMS... [OK]",
      "CHECKING BIO-METRIC SIGNATURES... [SKIPPED]",
      "ESTABLISHING SECURE TUNNEL...",
      "HANDSHAKE FAILED: NO HOST DETECTED",
      "RETRYING CONNECTION...",
      "SCANNING FOR AVAILABLE NODES...",
      "WARNING: PORT 22 UNREACHABLE",
      "ENCRYPTING LOCAL BUFFER...",
      "SYSTEM STANDBY MODE ENGAGED",
      "WAITING FOR USER INPUT...",
      "MONITORING NETWORK TRAFFIC...",
      "DETECTING ANOMALIES...",
      "FIREWALL STATUS: ACTIVE",
      "ZERO-DAY PROTECTION: ENABLED",
      "QUANTUM ENCRYPTION: READY",
      "PING 127.0.0.1 (127.0.0.1): 56 data bytes",
      "64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.045 ms",
      "MEMORY DUMP: 0x00000000 - 0x00FFFFFF [CLEAN]",
      "DAEMON 'SSHD' NOT FOUND",
      "SEARCHING FOR PROXY CHAINS...",
      "LOADING SHELL CONFIGURATION...",
      "APPLYING THEME 'CYBERPUNK_V2'...",
      "RENDER ENGINE: WEBGL2 ENABLED",
    ];

    let currentIndex = 0;
    const interval = setInterval(() => {
      const newLine = bootLogs[Math.floor(Math.random() * bootLogs.length)];
      const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
      const prefix = Math.random() > 0.8 ? "WARN" : Math.random() > 0.95 ? "ERR" : "INFO";
      const color = prefix === "WARN" ? "text-orange-400" : prefix === "ERR" ? "text-red-500" : "text-sci-cyan";
      
      setLines(prev => {
        const next = [...prev, `<span class="text-gray-500">[${timestamp}]</span> <span class="${color}">[${prefix}]</span> ${newLine}`];
        if (next.length > 15) return next.slice(next.length - 15);
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-mono text-[10px] leading-tight opacity-70 w-64">
      {lines.map((line, i) => (
        <div key={i} dangerouslySetInnerHTML={{ __html: line }} />
      ))}
    </div>
  );
};

export const HackerStandby: React.FC = () => {
  return (
    <div className="relative flex-1 flex flex-col items-center justify-center bg-black overflow-hidden select-none">
      {/* Background Matrix Rain */}
      <MatrixRain />

      {/* Vignette Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_90%)] pointer-events-none"></div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        
        {/* Warning Icon with Glitch */}
        <div className="relative group">
          <div className="absolute inset-0 bg-sci-red/20 blur-xl rounded-full animate-pulse"></div>
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-32 h-32 border-4 border-sci-red/50 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <WifiOff size={48} className="text-sci-red drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]" />
          </motion.div>
          
          {/* Orbital Rings */}
          <div className="absolute inset-[-20px] border border-sci-red/30 rounded-full w-[calc(100%+40px)] h-[calc(100%+40px)] animate-[reverse-spin_10s_linear_infinite] border-t-transparent border-l-transparent"></div>
          <div className="absolute inset-[-10px] border border-sci-cyan/30 rounded-full w-[calc(100%+20px)] h-[calc(100%+20px)] animate-[spin_5s_linear_infinite] border-b-transparent border-r-transparent"></div>
        </div>

        {/* Text Content */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black font-sci text-sci-red tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]">
            <GlitchText text="SYSTEM OFFLINE" />
          </h1>
          <p className="text-sci-dim font-mono text-sm tracking-widest uppercase">
            Neural Link Disconnected // Waiting for Target
          </p>
        </div>

        {/* Decorative HUD Elements */}
        <div className="flex gap-8 mt-8">
          <div className="flex flex-col gap-1 items-end">
            <div className="h-1 w-16 bg-sci-red/50"></div>
            <div className="h-1 w-12 bg-sci-red/30"></div>
            <div className="h-1 w-24 bg-sci-red/10"></div>
          </div>
          
          {/* Mini Terminal */}
          <div className="w-64 h-32 border border-sci-cyan/20 bg-black/80 p-2 overflow-hidden relative clip-corner">
            <div className="absolute top-0 left-0 bg-sci-cyan/20 px-2 py-0.5 text-[8px] font-bold text-sci-cyan">SYS_LOG.dmp</div>
            <div className="mt-4 h-full overflow-hidden mask-image-b">
               <BootSequence />
            </div>
          </div>

          <div className="flex flex-col gap-1 items-start">
            <div className="h-1 w-16 bg-sci-cyan/50"></div>
            <div className="h-1 w-12 bg-sci-cyan/30"></div>
            <div className="h-1 w-24 bg-sci-cyan/10"></div>
          </div>
        </div>

        {/* Bottom Status */}
        <div className="absolute bottom-[-150px] flex gap-8 text-[10px] text-sci-dim font-mono">
           <div className="flex items-center gap-2">
             <ShieldAlert size={12} className="text-sci-red animate-pulse"/> 
             <span>SECURITY: CRITICAL</span>
           </div>
           <div className="flex items-center gap-2">
             <Activity size={12} className="text-sci-cyan animate-pulse"/> 
             <span>IDLE CPU: 98%</span>
           </div>
        </div>
      </div>
      
      {/* Scanline Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none z-20"></div>
    </div>
  );
};
