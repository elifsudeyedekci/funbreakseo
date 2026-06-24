/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0A0A0B',
          surface: '#131316',
          elevated: '#1B1B1F',
        },
        border: {
          subtle: '#26262B',
          strong: '#34343A',
        },
        text: {
          primary: '#F5F5F7',
          secondary: '#A1A1AA',
          muted: '#6B6B73',
        },
        accent: {
          DEFAULT: '#5B8DEF',
          hover: '#4A7CE0',
          glow: 'rgba(91,141,239,0.15)',
        },
        geo: {
          DEFAULT: '#A371F7',
        },
        success: '#3FB950',
        warning: '#D29922',
        danger: '#F85149',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
