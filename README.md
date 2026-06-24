# Alaminos GSO — Purchase Request & Inventory Management System

Full-stack system: React (Vite) frontend + Supabase backend (Postgres, Auth, RLS).
Modules: Dashboard, Purchase Requests (create/edit/submit/approve/reject/print),
Inventory (with smart autocomplete), Categories, Purchase Orders, Acceptance and
Inspection Reports (AIR), Audit Logs.

## ✅ Backend status (already done)
- Supabase project created
- `supabase_schema.sql` already run (tables, triggers, RLS, business logic functions)
- Admin user created and promoted to `role = 'admin'` in `profiles`

## 1. Local setup (optional, to test before deploying)

```bash
npm install
npm run dev
```

The `.env` file already contains your project's URL and publishable key:
```
VITE_SUPABASE_URL=https://tpdwawzyqetycjeagykl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Visit `http://localhost:5173`, log in with the admin account you created in
Supabase Authentication.

## 2. Deploy to Vercel

### Option A — via Vercel website (no terminal needed)
1. Push this project to a GitHub repository (create a new repo, upload these files).
2. Go to https://vercel.com → **Add New... → Project**.
3. Import your GitHub repo.
4. Vercel auto-detects Vite. Before clicking Deploy, expand **Environment Variables** and add:
   - `VITE_SUPABASE_URL` = `https://tpdwawzyqetycjeagykl.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_roZFb07hA-MrKFB_AzAjeg_Hn6OMCtL`
5. Click **Deploy**. Done — you'll get a live `*.vercel.app` URL.

### Option B — via Vercel CLI
```bash
npm install -g vercel
vercel login
vercel
# follow prompts, then set env vars:
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY
vercel --prod
```

## 3. After deploying
- Visit your `*.vercel.app` URL → you should see the Sign In page.
- Log in with the admin account.
- Create categories first (Categories page), then inventory items, then try
  creating a Purchase Request.

## Notes on the schema
- `purchase_requests.status` flow: Draft → Submitted → Approved/Rejected.
  Approving calls `approve_purchase_request()` which deducts inventory stock
  and logs to `audit_logs` + `stock_movements`.
- `purchase_orders.status` flow: Draft → Issued. Generated from an approved PR
  via the "Generate PO" button on the PR detail page.
- `acceptance_inspection_reports` are generated from an Issued PO via the
  "Generate AIR" button. Signatory names (Pampolina, Sabinosa, Mista, Espinoza)
  are fixed defaults matching the Excel template and are not user-editable in the UI.
- Adding a brand-new user via Supabase Auth automatically creates a `profiles`
  row (role defaults to `staff`). Promote to `admin` with:
  ```sql
  update profiles set role = 'admin' where id = '<user-uuid>';
  ```

## Project structure
```
src/
  components/   Layout, modals, autocomplete, badges
  context/       AuthContext (Supabase auth state)
  lib/           supabase.js client
  pages/         one file per route
supabase_schema.sql   full DB schema — already applied to your project
```
