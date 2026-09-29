/** @type {import('tailwindcss').Config} */
module.exports = {
  // En celular, los estilos hover: no se quedan "pegados" ni obligan a tocar dos veces un botón.
  future: { hoverOnlyWhenSupported: true },
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        esmeralda: "#14402F",
        granate: "#A32638",
        papel: "#F7F8F4",
        "papel-alto": "#FDFDFB",
        "sobre-verde": "#F4F6F1",
      },
      fontFamily: {
        serif: ["var(--font-marcellus)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "Helvetica", "Arial", "sans-serif"],
      },
      transitionTimingFunction: {
        expo: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
