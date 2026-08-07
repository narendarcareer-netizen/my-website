# JobPilot Supabase setup

This guide connects your local JobPilot project to a new Supabase project. No service-role or database password is needed inside the Next.js application.

## 1. Create the Supabase project

1. Sign in at [supabase.com](https://supabase.com) and choose **New project**.
2. Select or create an organization.
3. Name the project `JobPilot` and generate a strong database password. Save that password in a password manager; do not add it to this project.
4. Choose the closest region and select **Create new project**.
5. Wait until the project dashboard says the project is ready.

## 2. Add the environment variables

1. In Supabase, open **Project Settings → API**.
2. Copy the **Project URL**.
3. Copy the client-safe **Publishable key**. In projects showing legacy keys, use the **anon public** key. Never copy the `service_role` or secret key into this app.
4. In the JobPilot project root, make a new file named `.env.local`.
5. Copy the contents of `.env.example` into `.env.local` and replace the placeholders:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`.env.local` is ignored by Git. The two `NEXT_PUBLIC_` Supabase values identify your project and are designed for browser use; security comes from authentication and Row Level Security. A service-role key bypasses those rules and must never be added to client code or these environment variables.

Restart `npm.cmd run dev` after changing environment variables.

## 3. Run the SQL migration

1. Open **SQL Editor** in your Supabase dashboard.
2. Choose **New query**.
3. Open `supabase/migrations/202608070001_jobpilot_phase2.sql` from this project and copy the entire file.
4. Paste it into the Supabase query and choose **Run**.
5. Confirm that the result says success.

The migration creates all five user-owned tables, indexes, timestamps, new-user profile creation, Row Level Security, individual CRUD policies, the private résumé bucket, and storage policies. It is safe to run again while developing because creation statements and policies are written to be repeatable.

## 4. Verify the private résumé bucket

The migration creates this automatically. To verify it:

1. Open **Storage**.
2. Confirm that a bucket named `resumes` exists.
3. Open its settings and confirm **Public bucket** is turned off.
4. Confirm the file-size limit is 5 MB and allowed types include PDF and DOCX.

If you prefer to create the bucket manually, choose **New bucket**, name it exactly `resumes`, leave **Public bucket** off, set the limit to 5 MB, and allow `application/pdf` plus `application/vnd.openxmlformats-officedocument.wordprocessingml.document`. You must still run the migration so the ownership policies exist.

Never make this bucket public. JobPilot stores files under a path beginning with the signed-in user's ID, and the storage policies only permit that user to access that path.

## 5. Configure authentication URLs

1. Open **Authentication → URL Configuration**.
2. Set **Site URL** to `http://localhost:3000` for local development.
3. Add `http://localhost:3000/auth/callback` to **Redirect URLs**.
4. When you deploy, add the production equivalents, such as `https://your-domain.com/auth/callback`, and change `NEXT_PUBLIC_SITE_URL` in the hosting environment.

Email confirmation is normally enabled. A new user will receive a confirmation email before signing in. Supabase's test-email delivery may be rate-limited; configure custom SMTP before production.

## 6. Test the flow

1. Run `npm.cmd run dev`.
2. Visit `http://localhost:3000/signup` and create an account.
3. Confirm the email, then sign in at `/login`.
4. Open `/profile`, save your details, preferences, and work authorization, then upload a small PDF or DOCX.
5. Sign out and confirm `/dashboard` sends you back to `/login`.

The app deliberately does not contain a database password, service-role key, AI key, payment key, or résumé content logging.
