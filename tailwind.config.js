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
      },
      keyframes: {
        'reverse-spin': {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' },
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
