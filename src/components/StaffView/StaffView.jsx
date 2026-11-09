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
import { getNotificationPermission } from '../../utils/pushNotifications';
import { verifyStaffPin, getAnnouncements, acknowledgeAnnouncement, getLeaveRequests, subscribeRealtimeEvents } from '../../utils/api';
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

  // Attendance Camera modal state
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
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

  // Load Staff Notifications (Leave updates and active announcements)
  const loadStaffNotifications = async (staff) => {
    if (!staff?.id) return;
    try {
      const [annData, leaveData] = await Promise.all([
        getAnnouncements({ staffId: staff.id, venue: staff.venue, activeOnly: true }),
        getLeaveRequests({ staffId: staff.id })
      ]);

      const annList = Array.isArray(annData) ? annData : [];
      setAnnouncements(annList);
      const unreadAnns = annList.filter(a => !a.isRead);
      setUnreadAnnouncementsCount(unreadAnns.length);

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
    } catch (e) {
      console.warn('Failed to load staff notifications:', e);
    }
  };

  useEffect(() => {
    if (loggedInStaff) {
      loadStaffNotifications(loggedInStaff);
    }
  }, [loggedInStaff]);

  // Realtime subscription for announcements and leave requests
  useEffect(() => {
    const unsubscribe = subscribeRealtimeEvents((eventType) => {
      if ((eventType === 'ANNOUNCEMENT_UPDATE' || eventType === 'ANNOUNCEMENT_READ' || eventType === 'LEAVE_UPDATE') && loggedInStaff) {
        loadStaffNotifications(loggedInStaff);
      }
    });
    return () => unsubscribe();
  }, [loggedInStaff]);

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
    } catch (err) {
      setError(err.message || 'PIN tidak terdaftar. Periksa kembali PIN Anda.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  // Reset to initial login screen for next staff
  const handleResetToLogin = () => {
    setCameraModalOpen(false);
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
          onSelectAttendance={() => setStep('ATTENDANCE')}
          onSelectToilet={() => setToiletScannerOpen(true)}
          onOpenLeaderboard={onOpenLeaderboard}
          onOpenStaffLeaveModal={() => {
            setLeaveModalInitialCategory(null);
            setLeaveModalOpen(true);
          }}
          onOpenMonitoring={() => {
            if (onOpenViewOnly) {
              onOpenViewOnly(loggedInStaff);
            }
          }}
          onTriggerCamera={(type, shift) => {
            setCameraActionType(type);
            setConfirmedShift(shift || null);
            setCameraModalOpen(true);
          }}
          onLogout={handleResetToLogin}
          leaveUpdateCount={leaveUpdateCount}
          announcements={announcements}
          unreadAnnouncementsCount={unreadAnnouncementsCount}
          onOpenAnnouncements={() => {
            setAnnouncementInitialView('LIST');
            setAnnouncementModalOpen(true);
          }}
        />
      )}

      {/* STEP 3: ATTENDANCE ACTIONS (Check-In / Break / Check-Out) */}
      {step === 'ATTENDANCE' && loggedInStaff && (
        <KioskActionScreen
          staff={loggedInStaff}
          activeShift={activeShift}
          onTriggerCamera={(type, shift) => {
            setCameraActionType(type);
            setConfirmedShift(shift || null);
            setCameraModalOpen(true);
          }}
          onOpenEarlyDeparture={() => {
            setLeaveModalInitialCategory('IZIN_PULANG_AWAL');
            setLeaveModalOpen(true);
          }}
          onLogout={handleResetToLogin}
          onBackToPortal={() => setStep('PORTAL')}
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
    </div>
  );
}
