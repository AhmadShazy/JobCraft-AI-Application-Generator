import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tailwindcss from 'eslint-plugin-tailwindcss'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, globalIgnores } from 'eslint/config'

// The plugin resolves the `tailwindcss` package relative to the config file's
// directory, so this must be absolute - a relative path makes that lookup fail.
const here = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { tailwindcss },
    settings: {
      tailwindcss: {
        config: path.join(here, 'tailwind.config.js'),
        // Real classes defined in src/index.css rather than by Tailwind itself.
        // Without these the rule reports them as typos.
        whitelist: [
          'animate-shimmer',
          'animate-fade-in',
          'animate-slide-in',
          'animate-scale-up',
        ],
      },
    },
    rules: {
      // A colour utility naming a step or opacity outside the resolved config
      // emits NO CSS and fails silently - the element just inherits its parent's
      // colour. This rule turns that into a build-time error.
      'tailwindcss/no-custom-classname': 'error',
      'tailwindcss/no-contradicting-classname': 'error',
    },
  },
])
