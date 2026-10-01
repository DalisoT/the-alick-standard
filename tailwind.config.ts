import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0B0B0C",
          soft: "#141416",
          card: "#17181B",
          border: "#26272B",
          line: "#1E2024",
        },
        cream: {
          DEFAULT: "#F4EFE6",
          soft: "#E8E1D3",
          deep: "#D9CFB7",
        },
        accent: {
          DEFAULT: "#C7A24B", // muted gold
          soft: "#E6C887",
          dim: "#8C6E2D",
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', "Georgia", "serif"],
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      letterSpacing: {
        widest: "0.25em",
      },
      boxShadow: {
        luxury: "0 30px 60px -30px rgba(199, 162, 75, 0.25)",
      },
      backgroundImage: {
        "sheen-gradient":
          "linear-gradient(120deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0) 70%)",
        "hairline":
          "linear-gradient(90deg, transparent, rgba(199,162,75,0.5), transparent)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        floatIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 4s linear infinite",
        floatIn: "floatIn 0.4s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;