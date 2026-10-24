import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0F172A",
          harbor: "#142235",
          ink: "#0B1220",
          card: "var(--dg-surface-card)",
          blue: "var(--dg-blue)",
          aqua: "var(--dg-aqua)",
          cyan: "var(--dg-cyan)",
          coral: "var(--dg-coral)",
        },
        risk: {
          low: "var(--dg-risk-low)",
          medium: "var(--dg-risk-medium)",
          high: "var(--dg-risk-high)",
          severe: "var(--dg-risk-severe)",
        },
      },
      boxShadow: {
        ny: "var(--dg-shadow-card)",
        floating: "0 20px 40px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--dg-border-accent)",
        sheet: "0 -10px 30px -5px rgba(0, 0, 0, 0.4)",
      },
      zIndex: {
        map: "0",
        control: "400",
        panel: "500",
        sheet: "600",
        modal: "1000",
      },
    },
  },
  plugins: [],
};
export default config;
