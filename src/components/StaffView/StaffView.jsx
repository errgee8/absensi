import React, { useState, useEffect } from 'react';
import KioskLoginScreen from './KioskLoginScreen';
import KioskPortalScreen from './KioskPortalScreen';
import KioskActionScreen from './KioskActionScreen';
import KioskCameraModal from './KioskCameraModal';
import ToiletScannerModal from '../ToiletChecklist/ToiletScannerModal';
import ToiletChecklistForm from '../ToiletChecklist/ToiletChecklistForm';
import StaffLeaveModal from './StaffLeaveModal';
import StaffAnnouncementModal from './StaffAnnouncementModal';
import MandatoryNotificationModal from './MandatoryNotificationModal';
import StaffPointNoticeModal from './StaffPointNoticeModal';
import StaffPointHistoryModal from './StaffPointHistoryModal';
import FaceRegistrationModal from './FaceRegistrationModal';
import { getNotificationPermission } from '../../utils/pushNotifications';
import { verifyStaffPin, getAnnouncements, acknowledgeAnnouncement, getLeaveRequests, getPoints, acknowledgeStaffPoint, subscribeRealtimeEvents, sendPresenceHeartbeat } from '../../utils/api';
import { getOperationalDateYMD } from '../../utils/time';
import { RESTROOM_LOCATIONS } from '../../utils/toiletService';
import { CheckCircle2 } from 'lucide-react';

export default function StaffView({
  venueSettings,
  onOpenViewOnly,
  onOpenAdminAuth,
  onOpenLeaderboard
}) {
  // Navigation step in Shared Kiosk: 'LOGIN' | 'PORTAL' | 'ATTENDANCE'
  const [step, setStep] = useState('LOGIN');

  // Staff & PIN state
  const [pin, setPin] = useState('');
  const [loggedInStaff, setLoggedInStaff] = useState(null);
  const [activeShift, setActiveShift] = useState(null);

  // Loading & error state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Attendance Camera & Face Registration modal state
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [faceRegistrationModalOpen, setFaceRegistrationModalOpen] = useState(false);
  const [cameraActionType, setCameraActionType] = useState('checkin');
  const [confirmedShift, setConfirmedShift] = useState(null);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveModalInitialCategory, setLeaveModalInitialCategory] = useState(null);

  // Notifications & Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [announcementInitialView, setAnnouncementInitialView] = useState('AUTO'); // 'AUTO' | 'LIST' | 'DETAIL'
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [leaveUpdateCount, setLeaveUpdateCount] = useState(0);

  // Violation Points state
  const [pendingPoints, setPendingPoints] = useState([]);
  const [staffPointTotal, setStaffPointTotal] = useState(0);
  const [staffPointCycleLabel, setStaffPointCycleLabel] = useState('');
  const [pointNoticeModalOpen, setPointNoticeModalOpen] = useState(false);
  const [pointHistoryModalOpen, setPointHistoryModalOpen] = useState(false);

  // Live Presence Heartbeat for active logged-in staff (direct WebSocket via Supabase Presence)
  useEffect(() => {
    if (!loggedInStaff) return;
    const sendBeat = () => {
      if (document.hidden) return; // Don't wake up network if tab is in background
      sendPresenceHeartbeat({
        id: loggedInStaff.id,
        name: loggedInStaff.name,
        role: loggedInStaff.role,
        venue: loggedInStaff.venue,
        type: 'STAFF'
      }).catch(() => {});
    };
    sendBeat();
    // 3-minute keepalive instead of 30s aggressive polling
    const interval = setInterval(sendBeat, 180000);
    return () => clearInterval(interval);
  }, [loggedInStaff]);

  // Toilet QR Scanner & Checklist state
  const [toiletScannerOpen, setToiletScannerOpen] = useState(false);
  const [toiletChecklistOpen, setToiletChecklistOpen] = useState(false);
  const [selectedToiletLocation, setSelectedToiletLocation] = useState(null);
  const [toiletSuccessAlert, setToiletSuccessAlert] = useState(null);
  const [directToiletLocation, setDirectToiletLocation] = useState(null);

  // Auto-detect direct scan QR token from URL parameters
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      let token = urlParams.get('toilet') || urlParams.get('scan') || urlParams.get('qr');
      if (!token && window.location.pathname.includes('/inspect/')) {
        token = window.location.pathname.split('/inspect/')[1].split('/')[0];
      }
      if (token) {
        const clean = token.trim().toUpperCase();
        const matched = RESTROOM_LOCATIONS.find(
          (l) => l.qr_token.toUpperCase() === clean || l.id.toUpperCase() === clean
        );
        if (matched) {
          setDirectToiletLocation(matched);
        }
      }
    } catch (e) {
      console.warn('URL token parse note:', e);
    }
  }, []);

  const [hasApprovedEarlyLeaveToday, setHasApprovedEarlyLeaveToday] = useState(false);

  // Load Staff Notifications (Leave updates, active announcements, and violation points)
  const loadStaffNotifications = async (staff) => {
    if (!staff?.id) return;
    try {
      const [annData, leaveData, pointsRes] = await Promise.all([
        getAnnouncements({ staffId: staff.id, venue: staff.venue, activeOnly: true }),
        getLeaveRequests({ staffId: staff.id }),
        getPoints({ staffId: staff.id, staffUuid: staff.uuid || '', cycleKey: 'CURRENT' }).catch(() => null)
      ]);

      const annList = Array.isArray(annData) ? annData : [];
      setAnnouncements(annList);
      const unreadAnns = annList.filter(a => !a.isRead);
      setUnreadAnnouncementsCount(unreadAnns.length);

      // Update violation points & pending mandatory acknowledgments
      if (pointsRes) {
        const nextPending = Array.isArray(pointsRes.pendingForStaff) ? pointsRes.pendingForStaff : [];
        setPendingPoints(nextPending);
        if (nextPending.length === 0) {
          setPointNoticeModalOpen(false);
        }
        setStaffPointTotal(Number(pointsRes.currentCycleTotalForStaff || 0));
        setStaffPointCycleLabel(pointsRes.currentCycle?.label || '');
      }

      // If there is any unread URGENT announcement, auto-open pop-up modal so staff sees it immediately!
      const hasUrgentUnread = unreadAnns.some(a => a.urgency === 'URGENT');
      if (hasUrgentUnread) {
        setAnnouncementModalOpen(true);
      }

      // Calculate leave updates
      const lastViewed = localStorage.getItem('last_viewed_leave_' + staff.id);
      const newUpdates = (leaveData || []).filter(r => {
        if (r.status === 'PENDING') return false;
        if (!lastViewed) return true;
        return new Date(r.updated_at || r.created_at) > new Date(lastViewed);
      });
      setLeaveUpdateCount(newUpdates.length);

      const todayOpYmd = getOperationalDateYMD();
      const earlyApproved = (leaveData || []).some(r => {
        if (r.status !== 'APPROVED') return false;
        const kind = r.leave_type || r.category || '';
        if (kind !== 'IZIN_PULANG_AWAL') return false;
        const startYmd = (r.start_date || '').slice(0, 10);
        const endYmd = (r.end_date || startYmd).slice(0, 10);
        if (!startYmd) return true;
        return startYmd <= todayOpYmd && todayOpYmd <= endYmd;
      });
      setHasApprovedEarlyLeaveToday(earlyApproved);
    } catch (e) {
      console.warn('Failed to load staff notifications:', e);
    }
  };

  useEffect(() => {
    if (loggedInStaff) {
      loadStaffNotifications(loggedInStaff);
    }
  }, [loggedInStaff]);

  // Realtime subscription for announcements, leave requests, and points
  useEffect(() => {
    const unsubscribe = subscribeRealtimeEvents((eventType) => {
      if ((eventType === 'ANNOUNCEMENT_UPDATE' || eventType === 'ANNOUNCEMENT_READ' || eventType === 'LEAVE_UPDATE' || eventType === 'POINT_UPDATE') && loggedInStaff) {
        loadStaffNotifications(loggedInStaff);
      }
    });
    return () => unsubscribe();
  }, [loggedInStaff]);

  const handleAcknowledgePoint = async (pointId) => {
    if (!loggedInStaff) return;
    await acknowledgeStaffPoint(pointId, {
      staffId: loggedInStaff.id,
      staffUuid: loggedInStaff.uuid || '',
      staffName: loggedInStaff.name,
      agreedTerms: true
    });
    await loadStaffNotifications(loggedInStaff);
  };

  const handleAcknowledgeAnnouncement = async (announcementId) => {
    if (!loggedInStaff) return;
    await acknowledgeAnnouncement(announcementId, {
      staffId: loggedInStaff.id,
      staffName: loggedInStaff.name,
      venue: loggedInStaff.venue,
      division: loggedInStaff.division
    });
    await loadStaffNotifications(loggedInStaff);
  };

  // Handle PIN submission on Screen 1
  const handleLogin = async (overridePin) => {
    const pinToVerify = (overridePin || pin).trim();
    if (!pinToVerify || pinToVerify.length < 4) return;
    setLoading(true);
    setError(null);

    try {
      const data = await verifyStaffPin({
        pin: pinToVerify
      });

      setLoggedInStaff(data.staff);
      setActiveShift(data.activeShift);
      loadStaffNotifications(data.staff);

      // Check Mandatory Notification Permission
      const perm = getNotificationPermission();
      if (perm !== 'unsupported' && perm !== 'granted') {
        setShowNotificationPrompt(true);
        // Do not proceed to PORTAL yet, wait for mandatory permission!
        return;
      }

      // If staff arrived via a direct QR scan link, open that restroom checklist immediately!
      if (directToiletLocation) {
        setSelectedToiletLocation(directToiletLocation);
        setToiletChecklistOpen(true);
      }
      setStep('PORTAL');

      // Check if staff has NEVER registered official face biometrics (separated from profile photos)
      if (!data.staff?.face_biometrics_registered) {
        setFaceRegistrationModalOpen(true);
      }
    } catch (err) {
      setError(err.message || 'PIN tidak terdaftar. Periksa kembali PIN Anda.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerCamera = (type, shift) => {
    // If staff hasn't registered official face biometrics yet, require face registration first!
    if (type === 'checkin' && !loggedInStaff?.face_biometrics_registered) {
      setFaceRegistrationModalOpen(true);
      return;
    }
    setCameraActionType(type);
    setConfirmedShift(shift || null);
    setCameraModalOpen(true);
  };

  const handleFaceRegistered = (newBiometricUrl) => {
    setLoggedInStaff((prev) => (prev ? {
      ...prev,
      face_biometrics_registered: true,
      biometric_photo_url: newBiometricUrl
    } : prev));
    setFaceRegistrationModalOpen(false);

    // Langsung lanjut absen menggunakan face recog yang telah didaftarkan!
    setCameraActionType('checkin');
    setConfirmedShift(null);
    setCameraModalOpen(true);
  };

  // Reset to initial login screen for next staff
  const handleResetToLogin = () => {
    setCameraModalOpen(false);
    setFaceRegistrationModalOpen(false);
    setToiletScannerOpen(false);
    setToiletChecklistOpen(false);
    setSelectedToiletLocation(null);
    setShowNotificationPrompt(false);
    setAnnouncementInitialView('AUTO');
    setStep('LOGIN');
    setLoggedInStaff(null);
    setPin('');
    setActiveShift(null);
    setError(null);
    setConfirmedShift(null);
    setToiletSuccessAlert(null);
    setPendingPoints([]);
    setStaffPointTotal(0);
    setStaffPointCycleLabel('');
    setPointNoticeModalOpen(false);
    setPointHistoryModalOpen(false);
    setHasApprovedEarlyLeaveToday(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Toast Notification for Toilet Submission Success */}
      {toiletSuccessAlert && (
        <div className="mb-4 bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-2xl flex items-center justify-between shadow-md animate-fade-in">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">{toiletSuccessAlert}</span>
          </div>
          <button
            onClick={() => setToiletSuccessAlert(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 ml-3"
          >
            Tutup
          </button>
        </div>
      )}

      {/* STEP 1: LOGIN */}
      {step === 'LOGIN' && (
        <KioskLoginScreen
          pin={pin}
          setPin={(val) => {
            setPin(val);
            if (error) setError(null);
          }}
          onLogin={handleLogin}
          onOpenAdminAuth={onOpenAdminAuth}
          onOpenLeaderboard={onOpenLeaderboard}
          loading={loading}
          error={error}
        />
      )}

      {/* STEP 2: ONE-GATE PORTAL (Absensi Kerja OR Scan QR Toilet OR View Only Monitoring) */}
      {step === 'PORTAL' && loggedInStaff && (
        <KioskPortalScreen
          staff={loggedInStaff}
          activeShift={activeShift}
          hasApprovedEarlyLeaveToday={hasApprovedEarlyLeaveToday}
          onSelectAttendance={() => setStep('ATTENDANCE')}
          onSelectToilet={() => setToiletScannerOpen(true)}
          onOpenLeaderboard={onOpenLeaderboard}
          onOpenStaffLeaveModal={() => {
            setLeaveModalInitialCategory(null);
            setLeaveModalOpen(true);
          }}
          onOpenMonitoring={() => {
            if (onOpenViewOnly) {
              onOpenViewOnly({ ...loggedInStaff, pin });
            }
          }}
          onTriggerCamera={handleTriggerCamera}
          onOpenFaceRegistration={() => setFaceRegistrationModalOpen(true)}
          onLogout={handleResetToLogin}
          leaveUpdateCount={leaveUpdateCount}
          announcements={announcements}
          unreadAnnouncementsCount={unreadAnnouncementsCount}
          onOpenAnnouncements={() => {
            setAnnouncementInitialView('LIST');
            setAnnouncementModalOpen(true);
          }}
          pointTotal={staffPointTotal}
          pointCycleLabel={staffPointCycleLabel}
          pendingPointsCount={pendingPoints.length}
          onOpenPointHistory={() => setPointHistoryModalOpen(true)}
          onOpenPendingPoints={() => setPointNoticeModalOpen(true)}
          onProfilePhotoUpdated={(url) =>
            setLoggedInStaff((prev) => (prev ? { ...prev, profile_photo_url: url } : prev))
          }
          onMoodUpdated={(emoji) =>
            setLoggedInStaff((prev) => (prev ? { ...prev, mood_emoji: emoji } : prev))
          }
        />
      )}

      {/* STEP 3: ATTENDANCE ACTIONS (Check-In / Break / Check-Out) */}
      {step === 'ATTENDANCE' && loggedInStaff && (
        <KioskActionScreen
          staff={loggedInStaff}
          activeShift={activeShift}
          hasApprovedEarlyLeave={hasApprovedEarlyLeaveToday}
          onTriggerCamera={handleTriggerCamera}
          onOpenEarlyDeparture={() => {
            setLeaveModalInitialCategory('IZIN_PULANG_AWAL');
            setLeaveModalOpen(true);
          }}
          onLogout={handleResetToLogin}
          onBackToPortal={() => setStep('PORTAL')}
        />
      )}

      {/* Mandatory First-Time Face Biometrics Registration Modal */}
      {faceRegistrationModalOpen && loggedInStaff && (
        <FaceRegistrationModal
          staff={loggedInStaff}
          isOpen={faceRegistrationModalOpen}
          onClose={() => setFaceRegistrationModalOpen(false)}
          onFaceRegistered={handleFaceRegistered}
        />
      )}

      {/* Attendance Camera Modal (Selfie + Watermark + Geofence) */}
      {cameraModalOpen && loggedInStaff && (
        <KioskCameraModal
          staff={loggedInStaff}
          activeShift={activeShift}
          actionType={cameraActionType}
          confirmedShift={confirmedShift}
          venueSettings={venueSettings}
          onCompleteAndAutoLogout={handleResetToLogin}
          onClose={() => setCameraModalOpen(false)}
        />
      )}

      {/* Toilet QR Scanner Modal */}
      <ToiletScannerModal
        isOpen={toiletScannerOpen}
        onClose={() => setToiletScannerOpen(false)}
        onLocationSelected={(location) => {
          setToiletScannerOpen(false);
          setSelectedToiletLocation(location);
          setToiletChecklistOpen(true);
        }}
      />

      {/* Toilet Hygiene Checklist Form */}
      {toiletChecklistOpen && selectedToiletLocation && loggedInStaff && (
        <ToiletChecklistForm
          location={selectedToiletLocation}
          staff={loggedInStaff}
          onClose={() => {
            setToiletChecklistOpen(false);
            setSelectedToiletLocation(null);
          }}
          onSuccess={() => {
            setToiletChecklistOpen(false);
            setSelectedToiletLocation(null);
            setToiletSuccessAlert(`Checklist kebersihan toilet ${selectedToiletLocation.name} berhasil disimpan!`);
            setTimeout(() => {
              setToiletSuccessAlert(null);
            }, 6000);
          }}
        />
      )}

      {/* Staff Personal Leave & Permission Requests Modal (Locked per Staff) */}
      {leaveModalOpen && loggedInStaff && (
        <StaffLeaveModal
          isOpen={leaveModalOpen}
          onClose={() => setLeaveModalOpen(false)}
          staff={loggedInStaff}
          activeShift={activeShift}
          initialCategory={leaveModalInitialCategory}
          onRefreshShifts={() => handleLogin(pin)}
          onMarkViewed={() => setLeaveUpdateCount(0)}
        />
      )}

      {/* Mandatory Push Notification Permission Modal */}
      {showNotificationPrompt && loggedInStaff && (
        <MandatoryNotificationModal
          staff={loggedInStaff}
          onSuccess={() => {
            setShowNotificationPrompt(false);
            if (directToiletLocation) {
              setSelectedToiletLocation(directToiletLocation);
              setToiletChecklistOpen(true);
            }
            setStep('PORTAL');
            if (!loggedInStaff?.profile_photo_url) {
              setFaceRegistrationModalOpen(true);
            }
          }}
          onLogout={handleResetToLogin}
        />
      )}

      {/* Official Management Announcement Modal */}
      {announcementModalOpen && loggedInStaff && (
        <StaffAnnouncementModal
          isOpen={announcementModalOpen}
          onClose={() => setAnnouncementModalOpen(false)}
          announcements={announcements}
          staff={loggedInStaff}
          initialView={announcementInitialView}
          onAcknowledge={handleAcknowledgeAnnouncement}
        />
      )}

      {/* Violation Point Detail & Acknowledge Modal (Opened when staff clicks notification badge) */}
      {step === 'PORTAL' && loggedInStaff && pointNoticeModalOpen && pendingPoints.length > 0 && (
        <StaffPointNoticeModal
          isOpen={pointNoticeModalOpen}
          onClose={() => setPointNoticeModalOpen(false)}
          pendingPoints={pendingPoints}
          staff={loggedInStaff}
          onAcknowledge={handleAcknowledgePoint}
        />
      )}

      {/* Staff Personal Point History Modal */}
      {pointHistoryModalOpen && loggedInStaff && (
        <StaffPointHistoryModal
          isOpen={pointHistoryModalOpen}
          onClose={() => setPointHistoryModalOpen(false)}
          staff={loggedInStaff}
          onOpenNoticeModal={() => setPointNoticeModalOpen(true)}
        />
      )}
    </div>
  );
}
