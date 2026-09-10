/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0B1120',
          card: '#1E293B',
          accent: '#EF4444',
          highlight: '#3B82F6',
          success: '#10B981',
          warning: '#F59E0B',
        },
      },
      animation: {
        'pulse-radar': 'radarPulse 3s cubic-bezier(0, 0, 0.2, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        radarPulse: {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(1.3)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
