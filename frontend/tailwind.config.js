/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Safelist dynamic color classes used in JS template literals
  safelist: [
    { pattern: /bg-(blue|purple|green|emerald|orange|red|yellow|indigo|teal|gray)-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /text-(blue|purple|green|emerald|orange|red|yellow|indigo|teal|gray)-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /border-(blue|purple|green|emerald|orange|red|yellow|indigo|teal|gray)-(50|100|200|300|400|500|600|700|800|900)/ },
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
