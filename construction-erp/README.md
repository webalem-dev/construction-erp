# Construction ERP

A single-page web app for construction companies to manage **projects, materials & stock, suppliers, HR, attendance, leave, payroll, and reporting** — with row-level security enforced by Supabase and a granular, role-based permission system on top.

Built as a **React 19 + Vite + TypeScript** SPA, deployed to **Vercel**.

---

## Tech stack

| Layer        | Choice                                                       |
|--------------|--------------------------------------------------------------|
| Framework    | React 19 (no SSR — pure client SPA)                          |
| Bundler      | Vite 8 + `@vitejs/plugin-react` (Oxc transformer)           |
| Language     | TypeScript (strict), transpiled by esbuild, **no `tsc -b`**  |
| Styling      | Tailwind CSS 3 + `tailwindcss-animate`                       |
| Components   | Radix UI primitives styled shadcn-style                      |
| State        | Zustand (with `persist` for theme/sidebar/auth)              |
| Routing      | React Router v7 (data routes via `<Routes>`)                 |
| Data         | TanStack Query + Supabase JS client                          |
| Forms        | react-hook-form + zod resolvers                              |
| Toasts       | sonner + react-hot-toast                                     |
| Database     | Supabase (PostgreSQL 17)                                     |
| Icons        | lucide-react                                                 |
| Charts       | Recharts                                                     |

---

## Local development

Prerequisites: **Node.js ≥ 20**.

```bash
# 1. Install dependencies
npm install

# 2. Copy the env template and fill in your Supabase URL + anon key
cp .env.example .env
#   edit .env:
#     VITE_SUPABASE_URL=https://pexqlkjlefildktjgrha.supabase.co
#     VITE_SUPABASE_ANON_KEY=<anon key from Supabase Dashboard>

# 3. Start the dev server (HMR)
npm run dev
# → http://localhost:5173
```

Other scripts:

```bash
npm run build          # vite build → dist/ (skips tsc; esbuild is enough)
npm run build:vercel   # same command, explicit name for Vercel
npm run preview        # serve the built dist/ on http://localhost:4173
npm run lint           # oxlint
```

> ⚠ **Why no `tsc -b`?** Vite uses esbuild for transpilation, which strips types without typechecking. Adding `tsc -b` would fail on a handful of pre-existing type errors in form-dialog libraries from earlier batches. Run a full `tsc --noEmit` manually if you want type safety, but it's not required for Vercel to deploy.

---

## Deploy to Vercel

This project is configured for Vercel out of the box. Three files do the work:

- `vercel.json` — SPA rewrites (so React Router handles deep links) + cache headers
- `.env.example` — documents the two required environment variables
- `.vercelignore` — keeps the deployment bundle small

### One-time setup

1. **Push the repo to GitHub / GitLab / Bitbucket.**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/<you>/construction-erp.git
   git push -u origin main
   ```

2. **Import in Vercel**
   - Go to <https://vercel.com/new>.
   - Select the repo.
   - In the **"Root Directory"** step, click "Edit" and pick `construction-erp/`.
     > Vite's `index.html`, `package.json`, and `vercel.json` live there.
   - Framework Preset should auto-detect as **Vite**.
   - Click **Deploy** — first deploy will fail because of missing env vars. That's expected.

3. **Add environment variables**
   - Project → **Settings** → **Environment Variables**.
   - Add the two variables from your local `.env` (or from Supabase Dashboard → Project → ⚙ Project Settings → API):
     | Name                    | Value                                       |
     |-------------------------|---------------------------------------------|
     | `VITE_SUPABASE_URL`     | `https://pexqlkjlefildktjgrha.supabase.co`  |
     | `VITE_SUPABASE_ANON_KEY`| the `anon` `public` JWT from the API page   |
   - Apply to **Production**, **Preview**, and **Development** (tick all three).
   - Click **Deployments** → redeploy the latest build.

4. **Done.** Vercel will rebuild on every `git push`. Preview deployments are automatic for branches.

### Why is the anon key safe in the browser?

The anon key is designed to be public — it ships inside the JavaScript bundle that every visitor downloads. Supabase enforces real security through **Row-Level Security** policies; the database project `pexqlkjlefildktjgrha` has all 92 policies bound to the `authenticated` role (see `supabase.txt` Pass 3). Anonymous users get nothing; only logged-in users (with a valid JWT) can read or write anything.

---

## Database

Hosted on Supabase project **`pexqlkjlefildktjgrha`**.

| Resource                            | Count |
|-------------------------------------|------:|
| Tables                              |    28 |
| Views                               |     2 |
| Functions                           |    22 |
| RLS policies                        |    92 |
| CHECK constraints                   |   154 |
| Audit triggers (events × tables)    |    42 |

The schema was hardened in **Batch 20 Pass 3** (`supabase/migrations/20260812120000_strengthen_schema.sql`):

- `leave_balances.remaining` is a **generated column** — the database computes it; the app cannot drift it
- 35 new **CHECK constraints** (`unit_price >= 0`, `start_date <= end_date`, etc.)
- `user_profiles.employee_id` foreign key to `employees.id`
- Every sensitive table logs INSERT/UPDATE/DELETE to `audit_logs` (with the actor's `auth.uid()`)
- All RLS policies rebound from `{public}` to `{authenticated}` (anon traffic is denied)

Full change log lives in `supabase.txt`.

---

## Project layout

```
construction-erp/
├── vercel.json              ← Vercel config (rewrites, headers)
├── .env.example             ← Supabase URL + anon key template
├── .vercelignore            ← trim the deployment bundle
├── package.json
├── vite.config.ts
├── index.html
├── public/                  ← static assets copied to dist/ as-is
└── src/
    ├── main.tsx             ← React entry
    ├── App.tsx              ← router + protected layouts
    ├── components/
    │   ├── layout/          ← Sidebar, Header, AppLayout
    │   ├── shared/          ← ProtectedRoute, ShortcutsHelp, …
    │   └── ui/              ← shadcn-style primitives
    ├── pages/               ← one folder per module (dashboard, employees, …)
    ├── store/               ← Zustand stores (auth, theme, sidebar, …)
    ├── hooks/               ← useKeyboardShortcuts, etc.
    ├── lib/                 ← supabase.ts, utils.ts
    ├── types/index.ts       ← shared TS types (Role, UserProfile, …)
    └── index.css            ← Tailwind layers + dark-mode + animations
```

---

## License

Private — internal project.
