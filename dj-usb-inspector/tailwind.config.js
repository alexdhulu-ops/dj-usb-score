/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'press-start': ['"Press Start 2P"', 'cursive'],
        'vt323': ['VT323', 'monospace'],
      },
      colors: {
        'dj-dark': '#0c0c14',
        'dj-gray': '#1e1e24',
        'dj-orange': '#ffaa00',
        'dj-green': '#00ff66',
        'dj-red': '#ff0055',
        'dj-cyan': '#00ffff',
        'dj-gold': '#ffd700',
      },
      keyframes: {
        'shine': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        'glitch': {
          '0%, 100%': { transform: 'translate(0)' },
          '33%': { transform: 'translate(-2px, 1px)' },
          '66%': { transform: 'translate(2px, -1px)' }
        },
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
          '55%': { opacity: '0.1' },
          '60%': { opacity: '1' },
          '95%': { opacity: '0.9' },
          '96%': { opacity: '0.2' },
          '98%': { opacity: '1' }
        }
      },
      animation: {
        'shine': 'shine 1.5s steps(8) infinite',
        'shine-slow': 'shine 3s steps(8) infinite',
        'glitch': 'glitch 0.2s steps(2) infinite',
        'flicker': 'flicker 2s steps(2) infinite',
      }
    },
  },
  plugins: [],
}
