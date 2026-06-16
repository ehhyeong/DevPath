# Responsive UI refinement context notes

- The user reported that the existing responsive CSS still feels visually off on mobile, foldables, Galaxy S-series devices, tablets, and iPhones.
- The user explicitly asked whether PC layout proportions would change. Decision: preserve desktop defaults and scope layout overrides to `max-width` media queries.
- The frontend app lives under `frontend`; route entry is `frontend/src/main.tsx`.
- Shared CSS is consolidated in `frontend/src/index.css`, so broad device refinements should be appended there rather than refactoring route components.
- `rg` is not installed in this environment; PowerShell file and string search are used instead.
- Several major pages use `zoom: 0.9` plus `width: calc(100% / 0.9)`. On tablet/mobile this can create a wider-than-viewport layout, so these zoom wrappers are reset below 1024px only.
- `SiteHeader` had desktop navigation and desktop tuning active from the `md` breakpoint. The header now keeps desktop navigation/user layout at `lg` and uses untuned mobile brand/user placement below 1024px.
- Verification: `npm run build` was blocked by PowerShell execution policy for `npm.ps1`; `npm.cmd run build` completed successfully.
- A local Vite dev server was started on `http://127.0.0.1:5174/` because port 5173 was already in use. The root URL returned HTTP 200.
