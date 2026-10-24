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
        brand: {
          navy: "#0F172A",
          harbor: "#142235",
          ink: "#0B1220",
          card: "rgba(20, 34, 53, 0.95)",
          blue: "#0EA5E9",
          aqua: "#20D6C2",
          cyan: "#38BDF8",
          coral: "#F43F5E",
        },
        risk: {
          low: "#22C55E",
          medium: "#F59E0B",
          high: "#F97316",
          severe: "#EF4444",
        },
      },
      boxShadow: {
        ny: "0 10px 30px -5px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)",
        floating: "0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(56, 189, 248, 0.15)",
        sheet: "0 -10px 30px -5px rgba(0, 0, 0, 0.6)",
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
