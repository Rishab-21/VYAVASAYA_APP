# Supabase setup for Vyavasaya

## Create and connect a project

1. Create a Supabase project in the Supabase dashboard and save its database password somewhere secure.
2. In the project settings, copy the Project URL and publishable key into a new `.env.local` at the project root:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
   ```

   Never put a `service_role` or secret key in this app. Client apps must use the publishable key; row-level security protects user data.

3. Apply `migrations/20261111000000_business_workspaces.sql` in the Supabase SQL Editor. The policy restricts every workspace row to the authenticated user whose ID is its `owner_id`.
4. In **Authentication → Sign In / Providers**, turn off **Confirm email**. The app maps each normalized phone number to a deterministic internal email identifier so Supabase can securely hash and check passwords without sending SMS or email. Do not enable Phone auth; hosted Supabase Phone auth requires an SMS provider.
5. Rebuild and sync the native app after setting `.env.local`:

   ```sh
   npm run build
   npx cap sync ios
   ```

   Then run the `App` scheme from `ios/App/App.xcodeproj`.

The app presents a phone number as the account ID and uses the password with Supabase email/password auth under the hood. The internal identifier uses the reserved `.invalid` domain and is never used for messaging. During signup the owner profile and business details are saved to auth user metadata and copied to the new workspace's Business Settings. After sign-in, each user's workspaces are fetched from and synced to `business_workspaces`; local IndexedDB remains available for offline use. For native development only, set `VITE_ENABLE_NATIVE_PREVIEW=true` in `.env.local` to keep an explicitly labeled local preview available. Leave that variable unset for production builds. Preview data remains on that device and is not backed up to the cloud.

This no-code flow does not verify that a user owns the phone number they enter. Password recovery is not available until a recovery method is added. Turning off email confirmation is a project-wide setting, so it also affects any email-based signup flows in the same Supabase project.

## Backups

Enable daily database backups from the project's **Database → Backups** settings and confirm the retention period against your plan. Supabase's hosted backups cover database restoration, while the app's built-in JSON export provides a portable per-business backup. Test a restore before relying on it for production records.
