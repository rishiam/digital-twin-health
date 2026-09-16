import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfeff",
          100: "#cffafe",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          900: "#164e63",
        },
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgb(8 145 178 / 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
