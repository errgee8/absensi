import { supabase } from './supabase.js';
import { createClient } from '@supabase/supabase-js';

const TOILET_SUPABASE_URL = 'https://nrrhkylpgitezjocgune.supabase.co';
const TOILET_SUPABASE_ANON_KEY = 'sb_publishable_GRzOFx-NzqaaBPCl3Oqr2A_1f8xpUNj';
const toiletClient = createClient(TOILET_SUPABASE_URL, TOILET_SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export async function computeLeaderboard(targetMonthStr) {
  // Determine current WITA month if not provided
  let year, month;
  if (targetMonthStr && /^\d{4}-\d{2}$/.test(targetMonthStr)) {
    const parts = targetMonthStr.split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
  } else {
    // Current WITA date
    const now = new Date();
    const witaDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Makassar' }));
    year = witaDate.getFullYear();
    month = witaDate.getMonth() + 1;
  }

  const monthPadded = String(month).padStart(2, '0');
  const startDate = `${year}-${monthPadded}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${monthPadded}-${String(lastDay).padStart(2, '0')}`;
  const monthName = `${MONTH_NAMES_ID[month - 1]} ${year}`;

  // 1. Attendance Data
  const { data: staffList, error: staffErr } = await supabase
    .from('staff')
    .select('*')
    .eq('is_active', true);

  if (staffErr) throw staffErr;

  const { data: attendanceLogs, error: logErr } = await supabase
    .from('attendance_logs')
    .select('*, staff(*)')
    .gte('shift_date', startDate)
    .lte('shift_date', endDate);

  if (logErr) throw logErr;

  const staffStats = {};
  for (const s of staffList || []) {
    // Exclude management division
    if (s.division === 'Management' || (s.role && s.role.toLowerCase().includes('manager'))) {
      continue;
    }

    staffStats[s.id] = {
      staff_id: s.id,
      name: s.name,
      role: s.role || 'Staff',
      venue: s.venue || 'JP / LC',
      division: s.division || s.department || 'Operasional',
      workDays: new Set(),
      totalLateSeconds: 0,
      earlyBird15mCount: 0,
      earlyBird30mCount: 0,
      onTimeCount: 0,
      perfectDays: 0
    };
  }

  for (const log of attendanceLogs || []) {
    const sId = log.staff_id;
    if (!staffStats[sId]) continue;

    staffStats[sId].workDays.add(log.shift_date);

    if (log.check_in_time) {
      let schedStart = '13:00';
      try {
        if (log.notes) {
          const parsed = typeof log.notes === 'string' ? JSON.parse(log.notes) : log.notes;
          if (parsed?.scheduled_start) schedStart = parsed.scheduled_start;
        }
      } catch (e) {}

      if (schedStart === '13:00' && log.staff?.shift_start) {
        schedStart = log.staff.shift_start;
      }

      // Check-in time converted to WITA
      const d = new Date(log.check_in_time);
      const witaTimeStr = d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Makassar', hour12: false });
      const [wH, wM, wS] = witaTimeStr.split(':').map(Number);
      const checkInSecs = (wH * 3600) + (wM * 60) + (wS || 0);

      const [sH, sM] = schedStart.split(':').map(Number);
      const schedSecs = (sH * 3600) + (sM * 60);

      const diffSecs = checkInSecs - schedSecs;

      if (diffSecs > 0) {
        staffStats[sId].totalLateSeconds += diffSecs;
      } else {
        staffStats[sId].onTimeCount++;
        const early = Math.abs(diffSecs);
        if (early >= 900) staffStats[sId].earlyBird15mCount++;
        if (early >= 1800) staffStats[sId].earlyBird30mCount++;
      }
    }
  }

  const attendanceRanked = Object.values(staffStats).map(st => {
    const totalDays = st.workDays.size;
    const cappedDays = Math.min(totalDays, 26);
    const workDaysScore = Math.round((cappedDays / 26) * 100 * 10) / 10;
    
    const lateMinutes = Math.floor(st.totalLateSeconds / 60);
    const lateSeconds = st.totalLateSeconds % 60;
    const latePenalty = Math.round((st.totalLateSeconds / 60) * 0.5 * 10) / 10;

    const earlyBonus = Math.round(((st.earlyBird15mCount * 1.0) + (st.earlyBird30mCount * 1.5)) * 10) / 10;

    const finalScore = Math.max(0, Math.round((workDaysScore - latePenalty + earlyBonus) * 10) / 10);

    return {
      staff_id: st.staff_id,
      name: st.name,
      role: st.role,
      venue: st.venue,
      division: st.division,
      total_days: totalDays,
      max_days: 26,
      total_late_seconds: st.totalLateSeconds,
      total_late_minutes: lateMinutes,
      late_seconds_remainder: lateSeconds,
      early_bird_count: st.earlyBird15mCount,
      early_bird_30m_count: st.earlyBird30mCount,
      on_time_count: st.onTimeCount,
      score: finalScore,
      breakdown: {
        workDaysScore,
        latePenalty,
        earlyBonus
      }
    };
  });

  // Sort attendance: Score DESC, total_days DESC, total_late_seconds ASC, early_bird_30m DESC
  attendanceRanked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.total_days !== a.total_days) return b.total_days - a.total_days;
    if (a.total_late_seconds !== b.total_late_seconds) return a.total_late_seconds - b.total_late_seconds;
    return b.early_bird_30m_count - a.early_bird_30m_count;
  });

  attendanceRanked.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  // 2. Toilet Inspection Data (Optimized select to prevent statement timeout)
  const { data: inspections, error: toiletErr } = await toiletClient
    .from('inspections')
    .select('id, staff_name, created_at, overall_status, photo_url')
    .gte('created_at', `${startDate}T00:00:00Z`)
    .lte('created_at', `${endDate}T23:59:59Z`)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (toiletErr) {
    console.warn('Toilet leaderboard query error, continuing with empty:', toiletErr.message);
  }

  const toiletStats = {};
  for (const ins of inspections || []) {
    const rawName = (ins.staff_name || '').trim();
    if (!rawName || rawName.toLowerCase() === 'test staff') continue;

    if (!toiletStats[rawName]) {
      toiletStats[rawName] = {
        name: rawName,
        total_inspections: 0,
        pass_count: 0,
        fail_count: 0,
        verified_photos_count: 0,
        recent_inspection_at: ins.created_at
      };
    }

    toiletStats[rawName].total_inspections++;
    if (ins.overall_status === 'pass') {
      toiletStats[rawName].pass_count++;
    } else {
      toiletStats[rawName].fail_count++;
    }

    if (ins.photo_url) {
      toiletStats[rawName].verified_photos_count++;
    }

    if (new Date(ins.created_at) > new Date(toiletStats[rawName].recent_inspection_at)) {
      toiletStats[rawName].recent_inspection_at = ins.created_at;
    }
  }

  // Connect staff venue / role from staff list if matching by name
  const toiletRanked = Object.values(toiletStats).map(ts => {
    const matchedStaff = (staffList || []).find(s => s.name.toLowerCase() === ts.name.toLowerCase());
    const venue = matchedStaff ? matchedStaff.venue : (ts.name.startsWith('LC') ? 'LuckyCat' : 'JP Karaoke');
    const role = matchedStaff ? (matchedStaff.role || matchedStaff.division) : 'Staff Kebersihan / Service';

    const passScore = ts.pass_count * 10;
    const photoBonus = ts.verified_photos_count * 3;
    const failPenalty = ts.fail_count * 5;
    const score = Math.max(0, passScore + photoBonus - failPenalty);

    const passRate = ts.total_inspections > 0
      ? Math.round((ts.pass_count / ts.total_inspections) * 100)
      : 100;

    return {
      name: ts.name,
      role,
      venue,
      total_inspections: ts.total_inspections,
      pass_count: ts.pass_count,
      fail_count: ts.fail_count,
      pass_rate: passRate,
      verified_photos_count: ts.verified_photos_count,
      recent_inspection_at: ts.recent_inspection_at,
      score,
      breakdown: {
        passScore,
        photoBonus,
        failPenalty
      }
    };
  });

  // Sort toilet: Score DESC, total_inspections DESC, pass_rate DESC, photos DESC
  toiletRanked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.total_inspections !== a.total_inspections) return b.total_inspections - a.total_inspections;
    if (b.pass_rate !== a.pass_rate) return b.pass_rate - a.pass_rate;
    return b.verified_photos_count - a.verified_photos_count;
  });

  toiletRanked.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return {
    period: {
      monthName,
      year,
      month,
      startDate,
      endDate,
      maxWorkDays: 26,
      generatedAt: new Date().toISOString()
    },
    attendance: attendanceRanked,
    toilet: toiletRanked
  };
}
