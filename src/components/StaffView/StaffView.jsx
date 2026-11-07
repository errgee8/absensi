import React, { useState } from 'react';
import KioskLoginScreen from './KioskLoginScreen';
import KioskActionScreen from './KioskActionScreen';
import KioskCameraModal from './KioskCameraModal';
import { verifyStaffPin } from '../../utils/api';

export default function StaffView({
  venueSettings
}) {
  // Navigation step in Shared Kiosk: 'LOGIN' | 'ACTION'
  const [step, setStep] = useState('LOGIN');

  // Staff & PIN state
  const [pin, setPin] = useState('');
  const [loggedInStaff, setLoggedInStaff] = useState(null);
  const [activeShift, setActiveShift] = useState(null);

  // Loading & error state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Camera modal state
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraActionType, setCameraActionType] = useState('checkin');

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
      setStep('ACTION');
    } catch (err) {
      setError(err.message || 'PIN tidak terdaftar. Periksa kembali PIN Anda.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  // Auto-logout and reset terminal for next coworker
  const handleResetToLogin = () => {
    setCameraModalOpen(false);
    setStep('LOGIN');
    setLoggedInStaff(null);
    setPin('');
    setActiveShift(null);
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {step === 'LOGIN' ? (
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
      ) : (
        <KioskActionScreen
          staff={loggedInStaff}
          activeShift={activeShift}
          onTriggerCamera={(type) => {
            setCameraActionType(type);
            setCameraModalOpen(true);
          }}
          onLogout={handleResetToLogin}
        />
      )}

      {/* Camera Modal with 1.5s flash & 3s auto-logout */}
      {cameraModalOpen && loggedInStaff && (
        <KioskCameraModal
          staff={loggedInStaff}
          activeShift={activeShift}
          actionType={cameraActionType}
          venueSettings={venueSettings}
          onCompleteAndAutoLogout={handleResetToLogin}
          onClose={() => setCameraModalOpen(false)}
        />
      )}
    </div>
  );
}
