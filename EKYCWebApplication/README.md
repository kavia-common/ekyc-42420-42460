# EKYC Web Application (React + Supabase)

The EKYC Web Application is a monolithic React frontend that delivers all user and admin workflows for electronic Know Your Customer (KYC). It integrates directly with Supabase for authentication, database access, realtime updates, and private storage. The UI uses a lightweight retro theme with accessible components and clear status feedback.

## Features

- End-user flows: registration, login, profile management, KYC form submission, secure document upload, and realtime status tracking.
- Admin flows: filtered list of submissions, detail review, approve/reject/request more info, and audit logging.
- Security and RBAC: role inferred from the `profiles` table with RLS policies enforced by Supabase. Client-side gates are provided for convenience, but security relies on RLS.
- Realtime: live updates on user KYC status via Supabase Realtime channels.
- Notifications: retro-styled toasts for success, error, and info messages.

## Quick Start

1) Prerequisites
- Node.js 18+ and npm
- A Supabase project with URL and anon key

2) Configure environment
- Copy .env.example to .env and set values, especially:
  - REACT_APP_SUPABASE_URL
  - REACT_APP_SUPABASE_ANON_KEY
  - REACT_APP_FRONTEND_URL

3) Install dependencies
- npm install

4) Run the app
- npm start
- Open http://localhost:3000

To build for production, run npm run build.

## Environment Variables

This app uses Create React App naming (REACT_APP_*) so variables are embedded at build time.

Required
- REACT_APP_SUPABASE_URL: Your Supabase project URL (e.g., https://xyzcompany.supabase.co).
- REACT_APP_SUPABASE_ANON_KEY: The project anon public key.
- REACT_APP_FRONTEND_URL: Public site URL used for auth email redirects. Defaults to window.location.origin at runtime if not set.

Optional
- REACT_APP_API_BASE: Reserved placeholder for future API integration if a custom backend is added.
- REACT_APP_BACKEND_URL: Reserved placeholder for future backend service URL.
- REACT_APP_FRONTEND_URL: Explicitly set the public URL of the frontend (e.g., http://localhost:3000).
- REACT_APP_WS_URL: Reserved placeholder for websockets endpoint if needed beyond Supabase Realtime.
- REACT_APP_NODE_ENV: Overrides environment labeling if required.
- REACT_APP_NEXT_TELEMETRY_DISABLED: Convenience flag to disable external telemetry in some environments.
- REACT_APP_ENABLE_SOURCE_MAPS: Set to true/false to control build source maps in CI or production.
- REACT_APP_PORT: Port for local dev server override (CRA runs on 3000 by default).
- REACT_APP_TRUST_PROXY: Reserved; useful behind proxies if later needed.
- REACT_APP_LOG_LEVEL: Adjusts log verbosity for future custom logging.
- REACT_APP_HEALTHCHECK_PATH: Reserved placeholder if deploying behind load balancers.
- REACT_APP_FEATURE_FLAGS: JSON or CSV string to toggle features at runtime.
- REACT_APP_EXPERIMENTS_ENABLED: true/false for experimental toggles.

Notes
- Only variables prefixed with REACT_APP_ are available in the browser.
- Changing environment variables requires re-running the dev server or rebuilding.

## Supabase Setup

The app expects the following resources in your Supabase project. These names match the code references.

Tables
- profiles
  - Columns: id (uuid, pk, references auth.users.id), email (text), role (text: 'user' or 'admin'), full_name (text), avatar_url (text), dob (date), address (text), phone (text)
  - Used by: auth context and profile screen for role and personal info.

- kyc_submissions
  - Columns: id (uuid, pk), user_id (uuid, references auth.users.id), first_name (text), last_name (text), dob (date), address (text), document_type (text), document_number (text), status (text: 'pending' | 'approved' | 'rejected'), documents (jsonb, array of file metadata), created_at (timestamptz default now()), updated_at (timestamptz default now())
  - Used by: user KYC form and status tracker; admin review dashboard.

- kyc_audit_logs
  - Columns: id (bigint pk or uuid), submission_id (uuid references kyc_submissions.id), action (text: 'approved' | 'rejected' | 'request_info'), notes (text), actor_user_id (uuid references auth.users.id), created_at (timestamptz default now())
  - Used by: admin actions for traceability.

Storage
- Bucket: kyc-documents (private)
  - Files are stored under user-scoped paths: kyc-documents/<userId>/<submissionId>/<docType>/<timestamp_filename>
  - Ensure the bucket is private. Generate signed URLs on the backend if you need previews; the current UI stores metadata and path for admin reference. Preview links for admins are optional and should respect access rules.

Triggers (optional but recommended)
- Maintain updated_at on kyc_submissions via a trigger (e.g., set updated_at = now() on update).

## RLS Policies (High-level Guidance)

Enable Row Level Security and add policies that enforce the following:

profiles
- Select/Update: A user can select and update only the row where id = auth.uid().
- Admins (role = 'admin') may need broader read access; you can add an admin policy if required.

kyc_submissions
- Select/Insert/Update/Delete for owner: A user can manage rows where user_id = auth.uid().
- Admin read/write: Allow select and update for users with admin role, covering all rows. Admin role can be enforced via a Postgres function that checks the `profiles.role` for auth.uid() or via JWT custom claims if you implement them.

kyc_audit_logs
- Insert: Only admins can insert.
- Select: Admins can read all audit logs. Users may be allowed to read logs for their own submission if you want transparency.

Storage: kyc-documents
- Disallow public access. Users may upload only into paths prefixed with their auth.uid(). Consider a storage policy such as:
  - Allow insert where (auth.uid()::text = split_part(object_name, '/', 1)) to restrict writing to their own folder.
  - Reads should be blocked by default; serve documents via signed URLs or an admin workflow where admins generate temporary access on demand.

These examples are high-level. Implement and test your exact policies in Supabase SQL using the latest best practices.

## How the App Uses Supabase

- Supabase client: src/supabase/client.js expects REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY to initialize the client.
- Authentication: src/hooks/useAuth.js manages session, ensures a profile row exists, and exposes role-based helpers like isAdmin.
- KYC flows: src/hooks/useKYC.js reads and writes kyc_submissions for the current user and subscribes to realtime changes for live status.
- Admin flows: src/hooks/useAdmin.js lists and filters submissions, fetches details, updates statuses, and writes audit logs.

## Running the App

Development
- npm install
- Create .env from .env.example and fill in Supabase values
- npm start
- Visit http://localhost:3000

Testing
- npm test

Production build
- npm run build
- Serve the build directory with your preferred static host. Ensure environment variables are set at build time.

## Troubleshooting

- Missing env: If you see "Supabase env vars missing..." in the console, ensure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set in your .env, then restart the dev server.
- RLS errors: If CRUD operations fail with permission errors, verify that RLS is enabled and the policies match the rules above.
- Email redirects: If sign-up emails do not redirect correctly, set REACT_APP_FRONTEND_URL to your site base URL so emailRedirectTo is computed correctly.
