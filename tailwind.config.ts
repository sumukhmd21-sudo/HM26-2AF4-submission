import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#050b1f",
          900: "#0a1130",
          800: "#0d1638",
          700: "#111d4a",
          600: "#16245f",
        },
        glow: {
          400: "#3b82f6",
          500: "#2563eb",
          600: "#1d4ed8",
        },
      },
      backgroundImage: {
        "navy-gradient":
          "radial-gradient(ellipse at top, rgba(37,99,255,0.15), transparent 60%), radial-gradient(ellipse at bottom right, rgba(59,130,246,0.10), transparent 60%), linear-gradient(180deg, #050b1f 0%, #0a1130 100%)",
        "card-glow":
          "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
        "button-gradient":
          "linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)",
      },
      boxShadow: {
        glow: "0 0 30px rgba(59,130,246,0.25)",
        "glow-lg": "0 0 60px rgba(59,130,246,0.35)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
