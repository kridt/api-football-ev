/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // slashed opacity (fx bg-ink/90)
        ink: "rgb(11 16 32 / <alpha-value>)",
        "ink-2": "rgb(17 22 42 / <alpha-value>)",
        muted: "#94a3b8",
      },
      boxShadow: {
        card: "0 8px 24px rgba(0,0,0,0.35)",
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
};
