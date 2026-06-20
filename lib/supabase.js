/**
 * supabase.js — Legacy re-export shim
 *
 * Previous imports of `@/lib/supabase` are handled here.
 * The server-side API routes should import from @/lib/supabaseAdmin.
 * Client components should import from @/lib/supabaseClient.
 *
 * This file re-exports the browser client for any remaining usages.
 */
export { supabase } from './supabaseClient';
