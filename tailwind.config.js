/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./js/**/*.{js,ts}"
  ],
  theme: {
    extend: {
      colors: {
        alien: '#A259FF',
        neonPink: '#FF4FD8',
        neonBlue: '#00E5FF',
        arcadeBlack: '#0E0E10',
        pixelGray: '#2B2B33',
        laserGreen: '#00FF85',
        warningYellow: '#FFD166',
        dangerRed: '#FF4F4F'
      },
      boxShadow: {
        alien: '0 0 10px #A259FF',
        neonGreen: '0 0 10px #00FF85',
        neonPink: '0 0 10px #FF4FD8',
        neonBlue: '0 0 10px #00E5FF'
      }
    }
  },
  plugins: []
};