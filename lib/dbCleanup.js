import { supabase } from './supabase';

let isCleaning = false;

export async function cleanupDatabase() {
  if (isCleaning) return;
  isCleaning = true;
  try {
    // 1. Hard delete any users that have is_active: false
    const { data: inactiveProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_active', false);

    if (profileError) {
      console.error('[Database Cleanup] Error fetching inactive profiles:', profileError);
    } else if (inactiveProfiles && inactiveProfiles.length > 0) {
      console.log(`[Database Cleanup] Hard deleting ${inactiveProfiles.length} soft-deleted users.`);
      for (const p of inactiveProfiles) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(p.id);
        if (deleteError) {
          console.error(`[Database Cleanup] Failed to delete user ${p.id}:`, deleteError.message);
        }
      }
    }

    // 2. Unassign inactive locations from students
    const { data: inactiveLocations, error: locationError } = await supabase
      .from('locations')
      .select('id')
      .eq('is_active', false);

    if (locationError) {
      console.error('[Database Cleanup] Error fetching inactive locations:', locationError);
    } else if (inactiveLocations && inactiveLocations.length > 0) {
      const inactiveLocIds = inactiveLocations.map(l => l.id);
      const { data: updatedStudents, error: updateError, count } = await supabase
        .from('students')
        .update({ location_id: null })
        .in('location_id', inactiveLocIds);

      if (updateError) {
        console.error('[Database Cleanup] Error unassigning inactive locations:', updateError);
      } else {
        console.log(`[Database Cleanup] Unassigned inactive locations from students.`);
      }
    }

  } catch (error) {
    console.error('[Database Cleanup] Error during cleanup:', error);
  } finally {
    isCleaning = false;
  }
}
