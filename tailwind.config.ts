import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ["var(--font-dm-sans)", "DM Sans", "sans-serif"],
        serif: ["var(--font-dm-serif-display)", "DM Serif Display", "Georgia", "serif"],
        body: ["var(--font-dm-sans)", "DM Sans", "sans-serif"],
      },
      colors: {
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
        "hero-overlay": "hsl(var(--hero-overlay))",
        teal: {
          DEFAULT: "rgb(var(--color-teal-rgb) / <alpha-value>)",
        },
        rose: {
          DEFAULT: "rgb(var(--color-rose-rgb) / <alpha-value>)",
        },
        slate: {
          DEFAULT: "rgb(var(--color-slate-rgb) / <alpha-value>)",
        },
        cream: {
          DEFAULT: "rgb(var(--color-cream-rgb) / <alpha-value>)",
        },
        warm: {
          DEFAULT: "rgb(var(--color-warm-rgb) / <alpha-value>)",
        },
        amber: {
          DEFAULT: "rgb(var(--color-amber-rgb) / <alpha-value>)",
        },
        charcoal: {
          DEFAULT: "rgb(var(--color-charcoal-rgb) / <alpha-value>)",
        },
        "light-gray": {
          DEFAULT: "rgb(var(--color-light-gray-rgb) / <alpha-value>)",
        },
        "off-white": {
          DEFAULT: "rgb(var(--color-off-white-rgb) / <alpha-value>)",
        },
        "dark-navy": {
          DEFAULT: "rgb(var(--color-dark-navy-rgb) / <alpha-value>)",
        },
        "near-black": {
          DEFAULT: "rgb(var(--color-near-black-rgb) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--color-ink-rgb) / <alpha-value>)",
        },
        "border-warm": {
          DEFAULT: "rgb(var(--color-border-warm-rgb) / <alpha-value>)",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        /* The EF design-system scale, by name. globals.css defines --r-* as
           the app's radius language (surface 16 / nested 10 / control 8 /
           control-sm 6 / pill), but Tailwind was only wired to the inherited
           shadcn --radius scale, where rounded-2xl is 24px. So a section card
           written as rounded-2xl rendered 24px where the design says 16px,
           and the drift kept coming back because the correct value had no
           utility name to reach for. Now it does. */
        surface: "var(--r-surface)",
        nested: "var(--r-nested)",
        control: "var(--r-control)",
        "control-sm": "var(--r-control-sm)",
        pill: "var(--r-pill)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "var(--radius-xl)",
        "2xl": "24px",
        "3xl": "32px",
        full: "999px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
