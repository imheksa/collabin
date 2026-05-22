/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'cursive'],
        mono: ['"Share Tech Mono"', 'monospace'],
      },
      colors: {
        neon: {
          cyan: '#00ffff',
          pink: '#ff00ff',
          yellow: '#ffff00',
          green: '#00ff41',
          orange: '#ff6600',
          red: '#ff0040',
          purple: '#bf00ff',
          blue: '#0080ff',
        },
        arena: {
          bg: '#080010',
          dark: '#0d001a',
          card: '#12002a',
          border: '#2a0050',
        },
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.92' },
        },
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        pulse_neon: {
          '0%, 100%': { boxShadow: '0 0 10px currentColor, 0 0 20px currentColor' },
          '50%': { boxShadow: '0 0 20px currentColor, 0 0 40px currentColor, 0 0 60px currentColor' },
        },
      },
      animation: {
        scanline: 'scanline 8s linear infinite',
        flicker: 'flicker 0.15s infinite',
        glitch: 'glitch 0.3s infinite',
        float: 'float 3s ease-in-out infinite',
        shake: 'shake 0.3s ease-in-out',
        pulse_neon: 'pulse_neon 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
