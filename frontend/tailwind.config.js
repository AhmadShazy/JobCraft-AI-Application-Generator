/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Primary — Teal/Blue scale (built from #219ebc) ───
        primary: {
          50:  '#edf8fd',
          100: '#d1eef8',
          200: '#a8e0f2',
          300: '#8ecae6', // Light sky blue
          400: '#52b8d8',
          500: '#219ebc', // Core teal — buttons, links, highlights
          600: '#1a8aa6', // Hover
          700: '#147591', // Active / pressed
          800: '#0e5f77',
          900: '#094d62',
          950: '#023047', // Deep navy — darkest bg, sidebar
        },
        // ─── Accent — Gold / Amber (built from #ffb703) ───
        accent: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#ffb703', // Core gold — CTA buttons, badges, active indicators
          600: '#f59e0b',
          700: '#fb8500', // Orange — secondary accent, hover on CTAs
          800: '#d97706',
          900: '#b45309',
        },
        // ─── Navy — dark backgrounds (from #023047) ───
        navy: {
          50:  '#f0f7fb',
          100: '#d6eaf4',
          200: '#aed3e8',
          300: '#79b4d4',
          400: '#4191bc',
          500: '#1f6f94',
          600: '#155878',
          700: '#0d4260',
          800: '#082e46',
          900: '#023047', // Base navy bg
          950: '#011824',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
