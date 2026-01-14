/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sci: {
          base: '#050505',
          panel: '#0a0f14',
          obsidian: '#11161d',
          cyan: '#00f3ff',
          violet: '#bc13fe',
          green: '#0aff00',
          red: '#ff2a00',
          text: '#e0f7fa',
          dim: '#566e7a',
        }
      },
      fontFamily: {
        sci: ['Rajdhani', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(0, 243, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 243, 255, 0.05) 1px, transparent 1px)",
      },
      animation: {
        'reverse-spin': 'reverse-spin 10s linear infinite',
        'scanline': 'scanline 8s linear infinite',
        'glitch': 'glitch 1s linear infinite',
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'hologram': 'hologram 4s infinite',
        'decode': 'decode 0.5s steps(10, end)',
      },
      keyframes: {
        'reverse-spin': {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' },
        },
        'scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'glitch': {
          '2%, 64%': { transform: 'translate(2px,0) skew(0deg)' },
          '4%, 60%': { transform: 'translate(-2px,0) skew(0deg)' },
          '62%': { transform: 'translate(0,0) skew(5deg)' },
        },
        'hologram': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.8 },
          '52%': { opacity: 0.5 },
          '54%': { opacity: 0.8 },
          '56%': { opacity: 1 },
        }
      }
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["night"],
    darkTheme: "night",
  },
}
