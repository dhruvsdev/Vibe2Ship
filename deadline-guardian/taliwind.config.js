/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // This forces all dark: classes to listen to the button
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}