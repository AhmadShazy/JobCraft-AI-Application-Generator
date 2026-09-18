# JobCraft AI — Frontend

React 19 + Vite 8 single-page app for JobCraft AI. See the [root README](../README.md)
for the full project overview, setup, and API reference.

## Scripts

```bash
npm install      # install dependencies
npm run dev      # dev server on http://localhost:5173 (strict port)
npm run lint     # ESLint (includes the Tailwind silently-dropped-class guard)
npm run build    # production build to dist/
npm run preview  # preview the production build locally
```

## Configuration

- `VITE_API_URL` sets the API base. Dev (`.env.development`) points at
  `http://localhost:8000`; production (`.env.production`) uses `/api`, which the
  Vercel rewrite in `vercel.json` proxies to the backend — keeping the browser
  same-origin so the auth cookie is always sent.
- Theming is stock Tailwind `slate` with explicit `dark:` pairs (`darkMode: 'class'`),
  plus `primary`/`accent` brand scales. Off-scale color steps and opacities emit no
  CSS and are caught by `eslint-plugin-tailwindcss` — keep `npm run lint` green.

## Routing

There is no router library. `App.jsx` selects a screen from auth state; the public
`/verify-email` and `/reset-password` links are matched by `window.location.pathname`.
