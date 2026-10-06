/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dj-dark': '#0f0f11',
        'dj-gray': '#1e1e24',
        'dj-orange': '#ff5100',
        'dj-green': '#00ff41',
      }
    },
  },
  plugins: [],
}
