import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17171c",
        canvas: "#f7f7f4",
        accent: { 50: "#f0f1ff", 100: "#e3e5ff", 500: "#6266e8", 600: "#5054d6", 700: "#4144b4" },
      },
      boxShadow: { soft: "0 18px 55px rgba(24, 24, 35, 0.08)" },
    },
  },
  plugins: [],
};

export default config;
