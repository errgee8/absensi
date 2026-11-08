import React, { useState, useEffect } from 'react';
import KioskLoginScreen from './KioskLoginScreen';
import KioskPortalScreen from './KioskPortalScreen';
import KioskActionScreen from './KioskActionScreen';
import KioskCameraModal from './KioskCameraModal';
import ToiletScannerModal from '../ToiletChecklist/ToiletScannerModal';
import ToiletChecklistForm from '../ToiletChecklist/ToiletChecklistForm';
import { verifyStaffPin } from '../../utils/api';
import { RESTROOM_LOCATIONS } from '../../utils/toiletService';
import { CheckCircle2 } from 'lucide-react';

export default function StaffView({
  venueSettings,
  onOpenViewOnly
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
          onOpenMonitoring={() => {
            if (onOpenViewOnly) {
              onOpenViewOnly(loggedInStaff);
            }
          }}
          onLogout={handleResetToLogin}
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
    </div>
  );
}
