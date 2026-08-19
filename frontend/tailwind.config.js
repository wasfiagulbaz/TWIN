/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#07090c',
          elevated: '#0d1117',
        },
        surface: {
          DEFAULT: '#11151c',
          2: '#151a23',
          3: '#1a202b',
          hover: '#1f2633',
        },
        border: {
          DEFAULT: '#262d3a',
          soft: '#1d232e',
        },
        text: {
          DEFAULT: '#e6edf3',
          muted: '#8b96a3',
          faint: '#5b6570',
        },
        accent: {
          DEFAULT: '#2fd98a',
          strong: '#4eeaa0',
          dim: '#1b8f5c',
          soft: 'rgba(47, 217, 138, 0.12)',
          border: 'rgba(47, 217, 138, 0.35)',
        },
        amber: {
          DEFAULT: '#f0a83b',
          soft: 'rgba(240, 168, 59, 0.12)',
        },
        red: {
          DEFAULT: '#ef5a5a',
          soft: 'rgba(239, 90, 90, 0.12)',
        },
      },
      fontFamily: {
        display: ['Sora', 'Inter', 'Arial', 'sans-serif'],
        body: ['Inter', 'Arial', 'Helvetica', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '18px',
        'xl': '24px',
      },
      boxShadow: {
        'card': '0 20px 60px rgba(0, 0, 0, 0.35)',
        'glow-accent': '0 0 40px rgba(47, 217, 138, 0.15)',
        'inner-soft': 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(47, 217, 138, 0.4)' },
          '70%': { boxShadow: '0 0 0 8px rgba(47, 217, 138, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(47, 217, 138, 0)' },
        },
        'skeleton-shimmer': {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out both',
        'slide-up': 'slide-up 0.3s ease-out both',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'skeleton-shimmer': 'skeleton-shimmer 1.4s linear infinite',
        'spin-slow': 'spin-slow 0.8s linear infinite',
      },
    },
  },
  plugins: [],
}
