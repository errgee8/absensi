import fs from 'fs';
import path from 'path';
import { cloudDb, isSupabaseConfigured } from '../server/supabase.js';
import { getSetting, setSetting } from '../server/db.js';

async function resetQuizHistory() {
  console.log('--- RESETTING ALL STAFF QUIZ HISTORY ---');
  console.log('isSupabaseConfigured:', isSupabaseConfigured);

  let existing = [];
  if (isSupabaseConfigured) {
    try {
      existing = (await cloudDb.getSetting('staff_quiz_completions')) || [];
      console.log(`Found ${existing.length} existing quiz records in Supabase.`);
    } catch (err) {
      console.warn('Could not read existing completions from Supabase:', err.message);
    }
  }

  // Also check local SQLite
  try {
    const localExisting = getSetting('staff_quiz_completions');
    if (localExisting && Array.isArray(localExisting)) {
      console.log(`Found ${localExisting.length} existing quiz records in local DB.`);
    }
  } catch {}

  // 1. Save safety backup
  if (existing.length > 0) {
    const backupDir = path.resolve('backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, `quiz_completions_backup_${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(existing, null, 2), 'utf-8');
    console.log(`✅ Safety backup saved to: ${backupPath}`);
  }

  // 2. Clear in Supabase
  if (isSupabaseConfigured) {
    await cloudDb.saveSetting('staff_quiz_completions', [], 'Purged quiz completions: restart all staff quiz from 0 with new questions');
    console.log('✅ Supabase "staff_quiz_completions" cleared to empty array [].');
  }

  // 3. Clear in local SQLite
  try {
    setSetting('staff_quiz_completions', []);
    console.log('✅ Local SQLite "staff_quiz_completions" cleared to empty array [].');
  } catch (err) {
    console.warn('Could not clear local SQLite setting:', err.message);
  }

  // 4. Verify clearance
  if (isSupabaseConfigured) {
    const verify = await cloudDb.getSetting('staff_quiz_completions');
    console.log('Verification check from Supabase:', verify);
    if (Array.isArray(verify) && verify.length === 0) {
      console.log('🎉 SUCCESS: All staff quiz history has been completely purged!');
      console.log('All LuckyCat staff will now receive the fresh quiz with the new balanced options.');
    } else {
      console.error('⚠️ Verification failed, returned:', verify);
    }
  }

  process.exit(0);
}

resetQuizHistory().catch((err) => {
  console.error('Fatal error resetting quiz history:', err);
  process.exit(1);
});
