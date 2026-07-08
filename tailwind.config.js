/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#05070c',
        panel: '#0b101a',
        line: '#1d2a3d',
        electric: '#0b8cff',
        gold: '#f6c453',
      },
      boxShadow: {
        glow: '0 0 40px rgba(11, 140, 255, 0.22)',
        gold: '0 0 28px rgba(246, 196, 83, 0.18)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
