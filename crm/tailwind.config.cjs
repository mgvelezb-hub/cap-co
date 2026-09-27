/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        esmeralda: "#14402F",
        granate: "#A32638",
        ambar: "#8A5A00",
        papel: "#F7F8F4",
        "papel-alto": "#FDFDFB",
        "sobre-verde": "#F4F6F1",
      },
      fontFamily: {
        serif: ["var(--font-marcellus)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
