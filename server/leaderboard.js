import { supabase, resolveAttendancePhotoUrls } from './supabase.js';
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
  const monthKey = `${year}-${monthPadded}`;

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

  // Check if a leaderboard reset cutoff timestamp is active (Reset Leaderboard Saja)
  let leaderboardResetAt = null;
  let staffPointsList = [];
  let staffDayAdjustmentsList = [];
  let staffStreaksMap = {};

  try {
    const { data: resetSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'leaderboard_reset_at')
      .maybeSingle();
    if (resetSetting?.value) {
      const parsedD = new Date(resetSetting.value);
      if (!isNaN(parsedD.getTime())) {
        leaderboardResetAt = parsedD;
      }
    }

    const { data: pointsSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'staff_points')
      .maybeSingle();
    if (Array.isArray(pointsSetting?.value)) staffPointsList = pointsSetting.value;

    const { data: dayAdjSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'staff_day_adjustments')
      .maybeSingle();
    if (Array.isArray(dayAdjSetting?.value)) staffDayAdjustmentsList = dayAdjSetting.value;

    const { data: streakSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'staff_streaks')
      .maybeSingle();
    if (streakSetting?.value && typeof streakSetting.value === 'object') staffStreaksMap = streakSetting.value;
  } catch (e) {
    console.warn('Leaderboard settings fetch note:', e.message);
  }

  // Build photo map of latest staff check-in selfies
  const staffPhotoMap = {};
  for (const log of attendanceLogs || []) {
    if (log.check_in_photo_url && log.staff_id) {
      if (!staffPhotoMap[log.staff_id]) {
        staffPhotoMap[log.staff_id] = log.check_in_photo_url;
      }
    }
  }

  // Build maps for manager points and manual day adjustments (strictly scoped to target month and launch date)
  const staffPointsMap = {};
  for (const pt of staffPointsList) {
    if (!pt.staff_id) continue;
    if (pt.created_at) {
      const ptDate = pt.created_at.slice(0, 7);
      if (ptDate !== monthKey) continue;
      // Launch cutoff: ignore points before 2026-11-23 00:00:00 WITA
      const ptTime = new Date(pt.created_at);
      if (ptTime < new Date('2026-11-22T16:00:00.000Z')) continue;
    }
    const isPlus = pt.point_type === 'PLUS' || pt.type === 'PLUS' || (pt.reason && pt.reason.includes('[Apresiasi Whistleblower]'));
    const pts = Math.abs(Number(pt.points) || 0);
    const signedPts = isPlus ? pts : -pts;
    staffPointsMap[pt.staff_id] = (staffPointsMap[pt.staff_id] || 0) + signedPts;
  }

  const staffDayAdjMap = {};
  for (const adj of staffDayAdjustmentsList) {
    if (!adj.staff_id) continue;
    if (adj.created_at) {
      const adjDate = adj.created_at.slice(0, 7);
      if (adjDate !== monthKey) continue;
      // Launch cutoff: ignore day adjustments before 2026-11-23 00:00:00 WITA
      const adjTime = new Date(adj.created_at);
      if (adjTime < new Date('2026-11-22T16:00:00.000Z')) continue;
    }
    staffDayAdjMap[adj.staff_id] = (staffDayAdjMap[adj.staff_id] || 0) + (Number(adj.adjustment_days) || 0);
  }

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
      avatar: s.avatar || null,
      workDays: new Set(),
      totalLateSeconds: 0,
      earlyBird15mCount: 0,       // >= 15m early (+2.0 pts)
      earlyBirdCount: 0,          // 1-14m early (+1.5 pts)
      onTimeExactCount: 0,        // exact on-time (+1.0 pt)
      gracePeriodCount: 0,        // 1-10m grace period (+0.5 pt, NOT late)
      lateCount: 0,               // >10m late (penalized!)
      onTimeCheckoutCount: 0,     // on-time checkout 0-15m (+1.0 pt)
      deliberateLateCheckoutCount: 0, // >15m after shift (0 bonus pts, anti-cheat)
      earlyCheckoutCount: 0,
      totalEarlyCheckoutSeconds: 0,
      perfectDays: 0
    };
  }

  for (const log of attendanceLogs || []) {
    const sId = log.staff_id;
    if (!staffStats[sId]) continue;

    // If leaderboard was reset, only count shifts occurring after reset timestamp
    if (leaderboardResetAt) {
      const logTime = new Date(log.check_in_time || log.created_at || `${log.shift_date}T12:00:00Z`);
      if (logTime < leaderboardResetAt) continue;
    }

    staffStats[sId].workDays.add(log.shift_date);

    let parsedLogNotes = {};
    try {
      if (typeof log.notes === 'string') parsedLogNotes = JSON.parse(log.notes);
      else if (log.notes) parsedLogNotes = log.notes;
    } catch {}

    const flagsArr = Array.isArray(log.flags)
      ? log.flags
      : (typeof log.flags === 'string' ? JSON.parse(log.flags || '[]') : []);

    // 1. Punctuality Check-In
    if (log.check_in_time) {
      let schedStart = '13:00';
      if (parsedLogNotes?.scheduled_start) {
        schedStart = parsedLogNotes.scheduled_start;
      } else if (log.staff?.shift_start) {
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

      // Check if late checkin was officially EXCUSED / WAIVED by management
      const isLateExcused = flagsArr.includes('FLAG_LATE_EXCUSED') || parsedLogNotes?.late_status === 'APPROVED';
      const isPartial = flagsArr.includes('FLAG_LATE_PARTIAL') || parsedLogNotes?.late_status === 'PARTIAL_APPROVED';

      if (diffSecs <= -900) {
        // Rank 1: Early Bird >= 15 mins early (+2.0 pts)
        staffStats[sId].earlyBird15mCount++;
      } else if (diffSecs < 0) {
        // Rank 2: Early Bird 1-14 mins early (+1.5 pts)
        staffStats[sId].earlyBirdCount++;
      } else if (diffSecs === 0) {
        // Rank 3: Exactly on-time at shift start (+1.0 pt)
        staffStats[sId].onTimeExactCount++;
      } else if (diffSecs <= 600) {
        // Rank 4: Within 10 mins grace period (+0.5 pt, NOT counted as late)
        staffStats[sId].gracePeriodCount++;
      } else {
        // Rank 5: > 10 mins late (past grace period) -> PENALTY
        if (!isLateExcused) {
          staffStats[sId].lateCount++;
          if (isPartial && parsedLogNotes?.late_remaining_minutes != null) {
            staffStats[sId].totalLateSeconds += (parsedLogNotes.late_remaining_minutes * 60);
          } else {
            staffStats[sId].totalLateSeconds += (diffSecs - 600);
          }
        }
      }
    }

    // 2. Punctuality Check-Out (Anti-Cheat: no extra reward for deliberate late checkout)
    if (log.check_out_time) {
      let schedEnd = '22:00';
      if (parsedLogNotes?.scheduled_end) {
        schedEnd = parsedLogNotes.scheduled_end;
      } else if (log.staff?.shift_end) {
        schedEnd = log.staff.shift_end;
      }

      const dOut = new Date(log.check_out_time);
      const witaOutStr = dOut.toLocaleTimeString('en-GB', { timeZone: 'Asia/Makassar', hour12: false });
      const [oH, oM, oS] = witaOutStr.split(':').map(Number);
      const checkOutSecs = (oH * 3600) + (oM * 60) + (oS || 0);

      const [eH, eM] = schedEnd.split(':').map(Number);
      const schedEndSecs = (eH * 3600) + (eM * 60);

      let earlySecs = schedEndSecs - checkOutSecs;
      // Handle shift ending past midnight (e.g. 03:00)
      if (schedEndSecs < 12 * 3600 && checkOutSecs > 12 * 3600) {
        earlySecs = (schedEndSecs + 24 * 3600) - checkOutSecs;
      }

      const isEarlyCheckoutApproved = flagsArr.includes('FLAG_EARLY_CHECKOUT_APPROVED') || parsedLogNotes?.early_checkout_status === 'APPROVED';

      if (earlySecs > 600 && earlySecs < 12 * 3600) {
        // Pulang lebih awal > 10 menit tanpa izin resmi
        if (!isEarlyCheckoutApproved) {
          staffStats[sId].earlyCheckoutCount++;
          staffStats[sId].totalEarlyCheckoutSeconds += Math.max(0, earlySecs);
        }
      } else {
        // Pulang tepat waktu saat jam shift selesai (0 s/d 15 menit pasca shift)
        const checkOutDelaySecs = -earlySecs;
        if (checkOutDelaySecs >= 0 && checkOutDelaySecs <= 900) {
          // Punctual checkout bonus (+1.0 pt)
          staffStats[sId].onTimeCheckoutCount++;
        } else if (checkOutDelaySecs > 900) {
          // Deliberate late checkout (>15m, misal nongkrong di parkiran) -> TIDAK ADA BONUS TAMBAHAN!
          staffStats[sId].deliberateLateCheckoutCount++;
        }
      }
    }
  }

  const attendanceRanked = Object.values(staffStats).map(st => {
    const manualDays = staffDayAdjMap[st.staff_id] || 0;
    const actualDays = st.workDays.size;
    const totalDays = Math.max(0, actualDays + manualDays);
    const cappedDays = Math.min(totalDays, 26);
    const workDaysScore = Math.round((cappedDays / 26) * 100 * 10) / 10;
    
    const lateMinutes = Math.floor(st.totalLateSeconds / 60);
    const lateSeconds = st.totalLateSeconds % 60;
    
    // Punctuality check-in reward
    const checkinBonus = Math.round((
      (st.earlyBird15mCount * 2.0) +
      (st.earlyBirdCount * 1.5) +
      (st.onTimeExactCount * 1.0) +
      (st.gracePeriodCount * 0.5)
    ) * 10) / 10;

    // Checkout punctuality reward (only for on-time checkouts within 0-15m)
    const checkoutBonus = Math.round((st.onTimeCheckoutCount * 1.0) * 10) / 10;

    // Penalties
    const latePenalty = Math.round((st.lateCount * 1.0 + (lateMinutes * 0.1)) * 10) / 10;
    const earlyCheckoutPenalty = Math.round((st.earlyCheckoutCount * 1.5) * 10) / 10;

    // Manager manual points (disciplinary minus & plus points)
    const managerPoints = staffPointsMap[st.staff_id] || 0;

    const finalScore = Math.max(0, Math.round((
      workDaysScore + checkinBonus + checkoutBonus - latePenalty - earlyCheckoutPenalty + managerPoints
    ) * 10) / 10);

    return {
      staff_id: st.staff_id,
      name: st.name,
      role: st.role,
      venue: st.venue,
      division: st.division,
      photo_url: staffPhotoMap[st.staff_id] || st.avatar || null,
      actual_days: actualDays,
      manual_days: manualDays,
      total_days: totalDays,
      max_days: 26,
      total_late_seconds: st.totalLateSeconds,
      total_late_minutes: lateMinutes,
      late_seconds_remainder: lateSeconds,
      late_count: st.lateCount,
      early_bird_15m_count: st.earlyBird15mCount,
      early_bird_count: st.earlyBirdCount,
      on_time_exact_count: st.onTimeExactCount,
      grace_period_count: st.gracePeriodCount,
      on_time_checkout_count: st.onTimeCheckoutCount,
      deliberate_late_checkout_count: st.deliberateLateCheckoutCount,
      early_checkout_count: st.earlyCheckoutCount,
      early_checkout_minutes: Math.round(st.totalEarlyCheckoutSeconds / 60),
      manager_points: managerPoints,
      streak: staffStreaksMap[st.staff_id]?.currentStreak || 0,
      longest_streak: staffStreaksMap[st.staff_id]?.longestStreak || 0,
      score: finalScore,
      breakdown: {
        workDaysScore,
        checkinBonus,
        checkoutBonus,
        latePenalty,
        earlyCheckoutPenalty,
        managerPoints
      }
    };
  });

  // Sort attendance: Score DESC, total_days DESC, total_late_seconds ASC, early_bird_15m DESC
  attendanceRanked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.total_days !== a.total_days) return b.total_days - a.total_days;
    if (a.total_late_seconds !== b.total_late_seconds) return a.total_late_seconds - b.total_late_seconds;
    return b.early_bird_15m_count - a.early_bird_15m_count;
  });

  attendanceRanked.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  // 2. Toilet Inspection Data (Fair 2-hour interval check)
  const { data: inspections, error: toiletErr } = await toiletClient
    .from('inspections')
    .select('id, staff_name, created_at, overall_status, photo_url, location_id')
    .gte('created_at', `${startDate}T00:00:00Z`)
    .lte('created_at', `${endDate}T23:59:59Z`)
    .order('created_at', { ascending: true })
    .limit(1000);

  if (toiletErr) {
    console.warn('Toilet leaderboard query error, continuing with empty:', toiletErr.message);
  }

  const toiletStats = {};
  const lastInspectedByLoc = {}; // location_id -> Date of last inspection

  for (const ins of inspections || []) {
    const rawName = (ins.staff_name || '').trim();
    if (!rawName || rawName.toLowerCase() === 'test staff') continue;

    const insTime = new Date(ins.created_at);

    // Operational launch cutoff (2026-11-23 00:00:00 WITA)
    const officialLaunchDate = new Date('2026-11-22T16:00:00.000Z');
    if (insTime < officialLaunchDate) continue;

    // If leaderboard was reset, only count inspections occurring after reset timestamp
    if (leaderboardResetAt) {
      if (insTime < leaderboardResetAt) continue;
    }

    // Operational hours check (WITA UTC+8: 08:00 AM to 05:00 AM next day)
    const witaHours = (insTime.getUTCHours() + 8) % 24;
    const isOutOfHours = (witaHours >= 5 && witaHours < 8);

    // Timeliness / Interval check per restroom location (Standard: 2 Hours = 120m + 15m grace = 135m)
    const locId = ins.location_id || 'unknown';
    const prevTime = lastInspectedByLoc[locId];
    let isOntime = false;
    let isLate = false;
    let isSpam = false;

    if (!prevTime) {
      isOntime = !isOutOfHours;
    } else {
      const diffMinutes = (insTime.getTime() - prevTime.getTime()) / (1000 * 60);
      if (diffMinutes < 15) {
        isSpam = true; // Duplicate/rapid scan within 15 minutes (ignored, anti-spam)
      } else if (diffMinutes > 135) {
        isLate = true; // Overdue inspection > 2 hours -> point deduct!
      } else {
        isOntime = true; // On-time inspection (early or exact 2hr mark gets standard points, no extra bonus for early)
      }
    }

    if (!isSpam) {
      lastInspectedByLoc[locId] = insTime;
    }

    if (!toiletStats[rawName]) {
      toiletStats[rawName] = {
        name: rawName,
        total_inspections: 0,
        ontime_count: 0,
        late_count: 0,
        out_of_hours_count: 0,
        pass_count: 0,
        fail_count: 0,
        verified_photos_count: 0,
        recent_inspection_at: ins.created_at
      };
    }

    toiletStats[rawName].total_inspections++;
    if (isOutOfHours) {
      toiletStats[rawName].out_of_hours_count++;
      toiletStats[rawName].late_count++;
    } else if (isOntime) {
      toiletStats[rawName].ontime_count++;
    } else if (isLate) {
      toiletStats[rawName].late_count++;
    }

    if (ins.overall_status === 'pass') {
      toiletStats[rawName].pass_count++;
    } else {
      toiletStats[rawName].fail_count++;
    }

    if (ins.photo_url) {
      toiletStats[rawName].verified_photos_count++;
      if (!toiletStats[rawName].latest_photo_url) {
        toiletStats[rawName].latest_photo_url = ins.photo_url;
      }
    }

    if (insTime > new Date(toiletStats[rawName].recent_inspection_at)) {
      toiletStats[rawName].recent_inspection_at = ins.created_at;
    }
  }

  // Connect staff venue / role from staff list if matching by name
  const toiletRanked = Object.values(toiletStats).map(ts => {
    const matchedStaff = (staffList || []).find(s => s.name.toLowerCase() === ts.name.toLowerCase());
    const venue = matchedStaff ? matchedStaff.venue : (ts.name.startsWith('LC') ? 'LuckyCat' : 'JP Karaoke');
    const role = matchedStaff ? (matchedStaff.role || matchedStaff.division) : 'Staff Kebersihan / Service';

    // Strict 2-hour interval weighting:
    // +15 pts per on-time inspection, +5 pts pass, +2 pts photo, -10 pts late penalty, -5 pts fail
    const ontimeScore = ts.ontime_count * 15;
    const latePenalty = ts.late_count * 10;
    const passBonus = ts.pass_count * 5;
    const photoBonus = ts.verified_photos_count * 2;
    const failPenalty = ts.fail_count * 5;
    const score = Math.max(0, ontimeScore + passBonus + photoBonus - latePenalty - failPenalty);

    const ontimeRate = ts.total_inspections > 0
      ? Math.round((ts.ontime_count / ts.total_inspections) * 100)
      : 0;

    const passRate = ts.total_inspections > 0
      ? Math.round((ts.pass_count / ts.total_inspections) * 100)
      : 100;

    const photoUrl = (matchedStaff && staffPhotoMap[matchedStaff.id]) ? staffPhotoMap[matchedStaff.id] : (ts.latest_photo_url || null);

    return {
      name: ts.name,
      role,
      venue,
      photo_url: photoUrl,
      total_inspections: ts.total_inspections,
      ontime_count: ts.ontime_count,
      late_count: ts.late_count,
      ontime_rate: ontimeRate,
      pass_count: ts.pass_count,
      fail_count: ts.fail_count,
      pass_rate: passRate,
      verified_photos_count: ts.verified_photos_count,
      recent_inspection_at: ts.recent_inspection_at,
      score,
      breakdown: {
        ontimeScore,
        latePenalty,
        passBonus,
        photoBonus,
        failPenalty
      }
    };
  });

  // Sort toilet: Score DESC, ontime_count DESC, ontime_rate DESC, total_inspections DESC
  toiletRanked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.ontime_count !== a.ontime_count) return b.ontime_count - a.ontime_count;
    if (b.ontime_rate !== a.ontime_rate) return b.ontime_rate - a.ontime_rate;
    if (b.total_inspections !== a.total_inspections) return b.total_inspections - a.total_inspections;
    return b.pass_rate - a.pass_rate;
  });

  toiletRanked.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  // Single Candidate Spotlight: Staf Paling Butuh Semangat / Improvement (Hall of Wake-Up Call)
  const attendeesPool = attendanceRanked.filter(a => a.total_days > 0);
  let needsImprovement = null;

  if (attendeesPool.length > 0) {
    const sortedImprovement = [...attendeesPool].sort((a, b) => {
      if (b.total_late_seconds !== a.total_late_seconds) return b.total_late_seconds - a.total_late_seconds;
      if (b.early_checkout_count !== a.early_checkout_count) return b.early_checkout_count - a.early_checkout_count;
      if (a.total_days !== b.total_days) return a.total_days - b.total_days;
      return a.score - b.score;
    });
    needsImprovement = sortedImprovement[0] || null;
  }

  await Promise.all([
    resolveAttendancePhotoUrls(attendanceRanked, ['photo_url']),
    resolveAttendancePhotoUrls(toiletRanked, ['photo_url'])
  ]);

  return {
    period: {
      monthName,
      year,
      month,
      startDate,
      endDate,
      maxWorkDays: 26,
      generatedAt: new Date().toISOString(),
      resetAt: leaderboardResetAt ? leaderboardResetAt.toISOString() : null
    },
    attendance: attendanceRanked,
    toilet: toiletRanked,
    needsImprovement
  };
}
