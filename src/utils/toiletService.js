import { createClient } from '@supabase/supabase-js';

const TOILET_SUPABASE_URL = 'https://nrrhkylpgitezjocgune.supabase.co';
const TOILET_SUPABASE_ANON_KEY = 'sb_publishable_GRzOFx-NzqaaBPCl3Oqr2A_1f8xpUNj';

export const toiletClient = createClient(TOILET_SUPABASE_URL, TOILET_SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

export const RESTROOM_LOCATIONS = [
  {
    id: 'lc-men',
    name: 'Men Toilet LC',
    building: 'LuckyCat Billiard',
    floor: 'Ground',
    gender: 'male',
    qr_token: 'QR-LC-MEN'
  },
  {
    id: 'lc-women',
    name: 'Woman Toilet LC',
    building: 'LuckyCat Billiard',
    floor: 'Ground',
    gender: 'female',
    qr_token: 'QR-LC-WOMEN'
  },
  {
    id: 'jp-men',
    name: 'Men Toilet JP',
    building: 'JPE KTV',
    floor: 'Main',
    gender: 'male',
    qr_token: 'QR-JP-MEN'
  },
  {
    id: 'jp-women',
    name: 'Woman Toilet JP',
    building: 'JPE KTV',
    floor: 'Main',
    gender: 'female',
    qr_token: 'QR-JP-WOMEN'
  }
];

export const ROUTINE_TASKS = [
  { id: 'task-lantai-kering', title: 'LANTAI KERING', applicable_gender: 'all' },
  { id: 'task-wastafel-kering', title: 'WASTAFEL KERING', applicable_gender: 'all' },
  { id: 'task-kaca-bersih', title: 'KACA BERSIH', applicable_gender: 'all' },
  { id: 'task-tissue-roll-terisi', title: 'TISSUE ROLL TERISI', applicable_gender: 'all' },
  { id: 'task-tissue-tangan-terisi', title: 'TISSUE TANGAN TERISI', applicable_gender: 'all' },
  { id: 'task-sabun-tangan-terisi', title: 'SABUN TANGAN TERISI', applicable_gender: 'all' },
  { id: 'task-urinoir-bersih', title: 'URINOIR BERSIH', applicable_gender: 'male' },
  { id: 'task-toilet-bersih', title: 'TOILET BERSIH', applicable_gender: 'all' },
  { id: 'task-sampah-kosong', title: 'SAMPAH KOSONG', applicable_gender: 'all' },
  { id: 'task-ruangan-harum', title: 'RUANGAN HARUM', applicable_gender: 'all' }
];

export async function getToiletLocations() {
  try {
    const { data, error } = await toiletClient
      .from('restroom_locations')
      .select('*')
      .order('name', { ascending: true });
    if (error || !data || data.length === 0) return RESTROOM_LOCATIONS;
    return data;
  } catch (err) {
    console.warn('Failed to fetch toilet locations, fallback to defaults:', err);
    return RESTROOM_LOCATIONS;
  }
}

export async function getRecentToiletInspections(limit = 20) {
  try {
    const { data, error } = await toiletClient
      .from('inspections')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Failed to fetch toilet inspections:', err);
    return [];
  }
}

export async function uploadToiletPhoto(base64Data, qrToken = 'QR') {
  if (!base64Data || !base64Data.startsWith('data:image')) return null;
  try {
    const matches = base64Data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches) return null;

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const byteCharacters = atob(matches[2]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: `image/${matches[1]}` });

    const filename = `${qrToken}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const { error: uploadErr } = await toiletClient.storage
      .from('inspection-photos')
      .upload(filename, blob, {
        contentType: `image/${matches[1]}`,
        upsert: true
      });

    if (uploadErr) {
      console.warn('Storage upload error:', uploadErr);
      return null;
    }

    const { data: publicData } = toiletClient.storage
      .from('inspection-photos')
      .getPublicUrl(filename);

    return publicData.publicUrl;
  } catch (e) {
    console.warn('Upload error:', e);
    return null;
  }
}

export async function submitRestroomInspection({
  location,
  staff,
  taskStatuses, // { [taskId]: 'pass' | 'fail' }
  photoBase64,
  notes = ''
}) {
  const timestamp = new Date().toISOString();
  let uploadedPhotoUrl = null;

  if (photoBase64) {
    uploadedPhotoUrl = await uploadToiletPhoto(photoBase64, location.qr_token);
  }

  const applicableTasks = ROUTINE_TASKS.filter(
    (t) => t.applicable_gender === 'all' || t.applicable_gender === location.gender
  );

  const taskResults = applicableTasks.map((t) => ({
    taskId: t.id,
    taskTitle: t.title,
    status: taskStatuses[t.id] || 'pass',
    isAdhoc: false,
    priority: 'normal'
  }));

  const allPassed = taskResults.every((t) => t.status === 'pass');
  const overallStatus = allPassed ? 'pass' : 'fail';
  const inspectionId = `ins-${Date.now()}`;

  const payload = {
    id: inspectionId,
    location_id: location.id,
    qr_token: location.qr_token,
    staff_id: staff.id,
    staff_name: staff.name,
    overall_status: overallStatus,
    photo_url: uploadedPhotoUrl,
    notes: notes || '',
    task_results: taskResults,
    upload_attempts: 1,
    telegram_notified: false,
    created_at: timestamp
  };

  const { data, error } = await toiletClient
    .from('inspections')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Failed to insert inspection:', error);
    throw error;
  }

  // Update restroom_locations status
  await toiletClient
    .from('restroom_locations')
    .update({
      last_inspected_at: timestamp,
      last_inspected_by: staff.name,
      last_status: allPassed ? 'clean' : 'needs_attention'
    })
    .eq('id', location.id);

  return { success: true, inspection: data, photoUrl: uploadedPhotoUrl };
}
