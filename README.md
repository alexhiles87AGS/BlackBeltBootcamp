# BlackBeltBootcamp V4.3

Professional mobile interface and reliable training workflows, developed from the authoritative V4.1 source and its V4.2 interface redesign.

Read [docs/V4_3_RELEASE.md](docs/V4_3_RELEASE.md) before rollout. **Apply the single targeted [V4.3 migration](supabase/migration_v43_reliability.sql) before deploying its frontend.** Never replay historical SQL on production.

React + TypeScript + Vite 5 + Supabase + Netlify. Use Node 20 and the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never include a service-role key in the browser build.

```sh
npm ci
npm run check
npm run dev
```

`check` runs TypeScript, 86 assertions (including a disposable PostgreSQL migration/RLS test), and the production build. Tests never connect to production Supabase.

Supabase Auth is the only login system. Reads remain controlled: one authenticated-open pull, then manual Sync. Account-scoped caches and a durable write queue provide resilience; local storage never grants authentication. Pending writes retry on authenticated open, connectivity recovery or explicit retry. No background read polling is added.

Historical files are references. Production remains V4.1 until the migration, preview acceptance and deployment are completed.
