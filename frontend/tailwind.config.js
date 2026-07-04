/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#030712',
          bg: '#050b18',
          card: 'rgba(10, 18, 36, 0.65)',
          border: 'rgba(255, 255, 255, 0.08)',
          cyan: '#06b6d4',
          cyanGlow: 'rgba(6, 182, 212, 0.3)',
          purple: '#a855f7',
          purpleGlow: 'rgba(168, 85, 247, 0.3)',
          magenta: '#ec4899',
          magentaGlow: 'rgba(236, 72, 153, 0.3)',
          green: '#22c55e',
          yellow: '#eab308',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
        mono: ['Fira Code', 'Courier New', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite alternate',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%': { boxShadow: '0 0 15px rgba(6, 182, 212, 0.4), inset 0 0 10px rgba(6, 182, 212, 0.2)' },
          '100%': { boxShadow: '0 0 25px rgba(168, 85, 247, 0.7), inset 0 0 15px rgba(168, 85, 247, 0.4)' },
        }
      }
    },
  },
  plugins: [],
}
