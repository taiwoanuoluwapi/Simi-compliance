import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { colors: { navy: { DEFAULT: "#101D43", deep: "#07132D" }, gold: { DEFAULT: "#D9AA25", warm: "#E8C45B" } }, fontFamily: { sans: ["Arial", "Helvetica", "sans-serif"] }, boxShadow: { soft: "0 18px 55px rgba(16,29,67,.09)" } } },
  plugins: []
};
export default config;
