/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta dorada
        gold: {
          50:  "#FFF9E6",
          100: "#FDEFC2",
          200: "#F6E190",
          300: "#E9C95B",
          400: "#DDB841",
          500: "#D4AF37", // principal
          600: "#C6A233",
          700: "#A8832B",
          800: "#7D6120",
          900: "#5C4618",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.10)",
        gold: "0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(212,175,55,.25)",
      },
      borderRadius: {
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
}
