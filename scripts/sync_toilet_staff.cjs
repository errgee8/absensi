const { createClient } = require('@supabase/supabase-js');
const cloudDb = require('../server/supabase.js');

const toiletClient = createClient(
  'https://nrrhkylpgitezjocgune.supabase.co',
  'sb_publishable_GRzOFx-NzqaaBPCl3Oqr2A_1f8xpUNj'
);

async function syncToiletStaff() {
  try {
    const { data: mainStaff, error: mainErr } = await cloudDb.supabase
      .from('staff')
      .select('*')
      .order('name', { ascending: true });

    if (mainErr) {
      console.error('Error fetching main staff:', mainErr);
      return false;
    }

    const { data: toiletStaff, error: tErr } = await toiletClient
      .from('staff_members')
      .select('*');

    if (tErr) {
      console.error('Error fetching toilet staff:', tErr);
      return false;
    }

    console.log('Main staff count:', mainStaff.length);
    console.log('Current toilet staff count before sync:', toiletStaff.length);

    const existingByName = new Map();
    for (const ts of toiletStaff) {
      existingByName.set(ts.name.trim().toLowerCase(), ts);
    }

    const upserts = [];
    for (const ms of mainStaff) {
      const key = ms.name.trim().toLowerCase();
      const existing = existingByName.get(key);
      const id = existing ? existing.id : `staff-${ms.legacy_code || ms.id}`;
      const roleStr = `${ms.venue || ''} - ${ms.role || ms.division || 'Server'}`.trim();
      upserts.push({
        id,
        name: ms.name.trim(),
        pin: ms.pin || '1234',
        role: roleStr,
        is_active: true
      });
    }

    console.log('Total staff to upsert:', upserts.length);
    const { data: synced, error: upsertErr } = await toiletClient
      .from('staff_members')
      .upsert(upserts)
      .select();

    if (upsertErr) {
      console.error('Upsert error:', upsertErr);
      return false;
    }

    console.log('Successfully synced staff count:', synced.length);
    const haslam = synced.find((s) => s.name.toLowerCase() === 'haslam');
    console.log('Haslam verified in toilet staff:', haslam);
    return true;
  } catch (err) {
    console.error('Sync failed:', err);
    return false;
  }
}

if (require.main === module) {
  syncToiletStaff().then(() => process.exit(0));
}

module.exports = { syncToiletStaff };
