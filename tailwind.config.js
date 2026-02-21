/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Approachable Corporate System
        navy: {
          50: '#eef2f7',
          100: '#d5e0ed',
          200: '#abc1db',
          300: '#81a2c9',
          400: '#5783b7',
          500: '#2d64a5',
          600: '#1F3A5F', // PRIMARY
          700: '#182d4a',
          800: '#102035',
          900: '#081220',
        },
        teal: {
          50: '#e8f5f5',
          100: '#c5e7e7',
          200: '#8dcfcf',
          300: '#55b7b7',
          400: '#2E8B8B', // SECONDARY
          500: '#257272',
          600: '#1d5a5a',
          700: '#154141',
          800: '#0d2929',
          900: '#061515',
        },
        amber: {
          50: '#fef9ee',
          100: '#fdf0cc',
          200: '#fae099',
          300: '#f7cf66',
          400: '#F4B860', // ACCENT
          500: '#e99f3a',
          600: '#c47e1f',
          700: '#9a6118',
          800: '#714512',
          900: '#47290b',
        },
        // Semantic tokens mapped to CSS variables
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
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
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
        '2xl': '16px',
        xl: '12px',
        lg: '10px',
        md: '8px',
        sm: '6px',
        xs: '4px',
      },
      boxShadow: {
        'soft': '0 2px 12px 0 rgba(31,58,95,0.06), 0 1px 3px 0 rgba(31,58,95,0.04)',
        'card': '0 4px 20px 0 rgba(31,58,95,0.08), 0 1px 4px 0 rgba(31,58,95,0.05)',
        'hover': '0 8px 30px 0 rgba(31,58,95,0.14), 0 2px 8px 0 rgba(31,58,95,0.08)',
        'focus': '0 0 0 3px rgba(46,139,139,0.25)',
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
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
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "fade-up": "fade-up 0.35s ease-out both",
        "scale-in": "scale-in 0.25s ease-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}