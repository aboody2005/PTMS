/**
 * supabase.js — Legacy re-export shim
 * Previous imports of `@/lib/supabase` are handled here.
 * Server-side API routes should import from @/lib/supabaseAdmin.
 * Client components should import from @/lib/supabaseClient.
 */
export { supabase } from './supabaseClient';
