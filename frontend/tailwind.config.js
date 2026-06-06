/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Primary — Dark Charcoal / Slate scale (built from #1e293b) ───
        primary: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#334155', // Core charcoal text highlight
          600: '#1e293b', // Hover
          700: '#0f172a', // Active
          800: '#020617', // Deep charcoal
          900: '#000000',
          950: '#000000',
        },
        // ─── Accent — Electric Cyan scale (built from #06b6d4) ───
        accent: {
          50:  '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4', // Core cyan — accents, action rings
          600: '#0891b2', // Hover
          700: '#0e7490', // Active
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        /* 
          ─── BACKUP OPTION 3: Cherry Crimson & Honey Gold ───
          primary: {
            50:  '#fff1f2',
            100: '#ffe4e6',
            200: '#fecdd3',
            300: '#fda4af',
            400: '#fb7185',
            500: '#f43f5e', // Cherry/Rose
            ...
          },
          accent: {
            50:  '#fffbeb',
            100: '#fef3c7',
            200: '#fde68a',
            300: '#fcd34d',
            400: '#fbbf24',
            500: '#f59e0b', // Gold
            ...
          }
        */
        // ─── Navy — Retained for fallback references, mapped to neutral slates for light theme ───
        navy: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

