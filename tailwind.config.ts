import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Cormorant Garamond", "serif"],
        body: ["DM Sans", "sans-serif"],
        label: ["Montserrat", "sans-serif"],
      },
      colors: {
        navy: {
          DEFAULT: "#0b0d1c",
          mid: "#12142a",
          deep: "#070915",
        },
        gold: {
          DEFAULT: "#c6a870",
          soft: "#dac394",
        },
        cream: "#f8f5ee",
        warm: "#fcfaf6",
        rose: "#ac808e",
        lavender: "#8a82b0",
        sage: "#8caa96",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "16px",
        lg: "24px",
        full: "100px",
        DEFAULT: "var(--radius)",
      },
      transitionTimingFunction: {
        brand: "cubic-bezier(.16,1,.3,1)",
      },
      animation: {
        "fade-up":    "fadeUp 0.7s cubic-bezier(.16,1,.3,1) both",
        "fade-in":    "fadeIn 0.5s ease both",
        "slide-right":"slideRight 0.6s cubic-bezier(.16,1,.3,1) both",
        "float":      "float 6s ease-in-out infinite",
        "pulse-gold": "pulseGold 4s ease-in-out infinite",
        "spiral":     "spiralDraw 3s cubic-bezier(.22,1,.36,1) forwards",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(28px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        slideRight: {
          from: { opacity: "0", transform: "translateX(-20px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-10px)" },
        },
        pulseGold: {
          "0%, 100%": { opacity: "0.15" },
          "50%":      { opacity: "0.28" },
        },
        spiralDraw: {
          from: { strokeDashoffset: "1200" },
          to:   { strokeDashoffset: "0" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
