/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink:   { 50:'#f7f8fb', 100:'#eef0f6', 200:'#d8dce8', 300:'#b3bacd', 400:'#7e86a3', 500:'#586079', 600:'#3f475d', 700:'#2c3346', 800:'#1c2233', 900:'#0e1322' },
        brand: { 50:'#eef2ff', 100:'#e0e7ff', 200:'#c7d2fe', 300:'#a5b4fc', 400:'#818cf8', 500:'#6366f1', 600:'#4f46e5', 700:'#4338ca', 800:'#3730a3', 900:'#312e81' },
      },
      fontFamily: {
        sans: ['Inter','ui-sans-serif','system-ui','-apple-system','Segoe UI','Roboto','sans-serif'],
        mono: ['JetBrains Mono','ui-monospace','SFMono-Regular','monospace'],
      },
      boxShadow: {
        soft:    '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
        elev:    '0 10px 30px -10px rgba(15,23,42,0.20)',
      },
    },
  },
  plugins: [],
};
