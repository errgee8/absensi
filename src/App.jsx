import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import StaffView from './components/StaffView/StaffView';
import ManagerDashboard from './components/ManagerDashboard/ManagerDashboard';
import AdminPinModal from './components/ManagerDashboard/AdminPinModal';
import { getNetworkStatus, getStaffList, getSettings } from './utils/api';
import { Smartphone } from 'lucide-react';

export default function App() {
  const [currentView, setView] = useState('staff'); // 'staff' | 'manager'
  const [staffList, setStaffList] = useState([]);
  const [networkStatus, setNetworkStatus] = useState(null);
  const [venueSettings, setVenueSettings] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);

  // Admin PIN Protection State
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  const loadAppData = async () => {
    try {
      const [staff, network, settings] = await Promise.all([
        getStaffList('ALL').catch(() => []),
        getNetworkStatus().catch(() => null),
        getSettings().catch(() => null)
      ]);
      setStaffList(staff);
      setNetworkStatus(network);
      setVenueSettings(settings);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    loadAppData();

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPwa = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleAdminSuccess = () => {
    setIsAdminAuthenticated(true);
    setAdminModalOpen(false);
    setView('manager');
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    setView('staff');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* PWA Home Screen Banner */}
      {installPrompt && (
        <div className="no-print bg-gradient-to-r from-emerald-600 to-teal-600 text-slate-950 px-4 py-2 flex items-center justify-between text-xs font-bold shadow-md">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-4 h-4" />
            <span>Install JP Shift PWA for 1-tap mobile check-in</span>
          </div>
          <button
            onClick={handleInstallPwa}
            className="px-3 py-1 bg-slate-950 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition"
          >
            Install App
          </button>
        </div>
      )}

      {/* Navigation Header */}
      <Navigation
        currentView={currentView}
        setView={(v) => {
          if (v === 'manager' && !isAdminAuthenticated) {
            setAdminModalOpen(true);
          } else {
            setView(v);
          }
        }}
        networkStatus={networkStatus}
        onOpenAdminAuth={() => setAdminModalOpen(true)}
        onAdminLogout={handleAdminLogout}
      />

      {/* Main Content View */}
      <main className="flex-1 pb-12">
        {currentView === 'staff' ? (
          <StaffView
            staffList={staffList}
            networkStatus={networkStatus}
            refreshNetwork={() => getNetworkStatus().then(setNetworkStatus)}
            venueSettings={venueSettings}
          />
        ) : (
          <ManagerDashboard
            venueSettings={venueSettings}
            refreshSettings={() => {
              getSettings().then(setVenueSettings);
              getStaffList('ALL').then(setStaffList);
            }}
          />
        )}
      </main>

      {/* Admin PIN Unlock Modal */}
      <AdminPinModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        onSuccess={handleAdminSuccess}
      />

      {/* Footer */}
      <footer className="no-print py-4 border-t border-slate-900 text-center text-[11px] text-slate-500">
        <div className="flex items-center justify-center space-x-2">
          <span>JP Karaoke & LuckyCat Attendance System • Version 2.0 PWA</span>
        </div>
      </footer>
    </div>
  );
}
