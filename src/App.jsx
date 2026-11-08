import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import StaffView from './components/StaffView/StaffView';
import ManagerDashboard from './components/ManagerDashboard/ManagerDashboard';
import AdminPinModal from './components/ManagerDashboard/AdminPinModal';
import { getNetworkStatus, getStaffList, getSettings } from './utils/api';
import { Smartphone, Download } from 'lucide-react';

export default function App() {
  const [currentView, setView] = useState('staff'); // 'staff' | 'manager'
  const [staffList, setStaffList] = useState([]);
  const [networkStatus, setNetworkStatus] = useState(null);
  const [venueSettings, setVenueSettings] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Admin PIN Protection State
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminAuth, setAdminAuth] = useState(null); // { role: 'MANAGER'|'VIEW_ONLY', canEdit: boolean, staffName?: string }

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

    // Check if already running standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPwa = async () => {
    if (!installPrompt) {
      alert('Untuk pengguna iPhone/Safari: Tekan tombol Bagikan (Share) di browser bawah lalu pilih "Tambahkan ke Layar Utama" (Add to Home Screen).\n\nUntuk Chrome di Android: Tekan titik tiga di pojok kanan atas lalu pilih "Install Aplikasi" / "Tambahkan ke Layar Utama".');
      return;
    }
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
  };

  const handleAdminSuccess = (authData) => {
    setAdminAuth(authData || { role: 'MANAGER', canEdit: true });
    setIsAdminAuthenticated(true);
    setAdminModalOpen(false);
    setView('manager');
  };

  const handleAdminLogout = () => {
    setAdminAuth(null);
    setIsAdminAuthenticated(false);
    setView('staff');
  };

  const handleOpenViewOnly = (staff) => {
    setAdminAuth({
      role: 'VIEW_ONLY',
      canEdit: false,
      staffName: staff?.name || 'Assistant Manager'
    });
    setIsAdminAuthenticated(true);
    setView('manager');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* PWA Home Screen Banner - High Contrast Royal Blue */}
      {!isInstalled && (
        <div className="no-print bg-blue-600 text-white px-4 py-2.5 flex items-center justify-between text-xs font-black shadow-md">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-4 h-4 shrink-0" />
            <span>Pasang Staff Portal PWA di HP staf untuk akses cepat 1-klik</span>
          </div>
          <button
            onClick={handleInstallPwa}
            className="px-3.5 py-1 bg-white text-blue-900 rounded-xl text-xs font-black hover:bg-blue-50 active:scale-95 transition flex items-center space-x-1.5 shadow-sm shrink-0 ml-2"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Download PWA</span>
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
        adminAuth={adminAuth}
        onOpenAdminAuth={() => setAdminModalOpen(true)}
        onAdminLogout={handleAdminLogout}
      />

      {/* Main Content View */}
      <main className="flex-1">
        {currentView === 'staff' ? (
          <StaffView
            venueSettings={venueSettings}
            onOpenViewOnly={handleOpenViewOnly}
            onOpenAdminAuth={() => setAdminModalOpen(true)}
          />
        ) : (
          <ManagerDashboard
            venueSettings={venueSettings}
            refreshSettings={loadAppData}
            adminAuth={adminAuth}
            isReadOnly={adminAuth?.role === 'VIEW_ONLY' || !adminAuth?.canEdit}
          />
        )}
      </main>

      {/* Footer Branding */}
      <footer className="no-print border-t-2 border-slate-200 py-4 text-center text-xs text-slate-900 bg-white font-black">
        <p>
          Staff Portal by Ryan Gerrit • Lucky Cat &amp; JP Executive Karaoke
        </p>
      </footer>

      {/* Admin Authentication PIN Modal */}
      <AdminPinModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        onSuccess={handleAdminSuccess}
      />
    </div>
  );
}
