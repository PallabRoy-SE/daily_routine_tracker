import { useState, useEffect } from 'react';
import { seedTestData } from '../seedDatabase';
import { syncWithGDrive } from '../services/syncEngine';
// import Database from '@tauri-apps/plugin-sql';
import { disconnectGoogleAccount } from '../services/authService';
import { useTheme } from '../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

const SettingsPanel = () => {
  const { theme, toggleTheme } = useTheme();
  const [seeding, setSeeding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const checkConnection = async () => {
    try {
      const rows: { value: string }[] = await window.electronAPI.dbSelect(
        "SELECT value FROM app_settings WHERE key = 'refresh_token'"
      );
      setIsConnected(rows.length > 0 && !!rows[0].value);
    } catch (err) {
      console.error('Failed to check connection status:', err);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleSeed = async () => {
    try {
      setSeeding(true);
      await seedTestData();
      setSeedSuccess(true);
      setTimeout(() => {
        setSeedSuccess(false);
        window.location.reload();
      }, 1500);
    } catch (e) {
      console.error(e);
      alert('Error seeding database: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSeeding(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await syncWithGDrive();
      await checkConnection();
      setSyncSuccess(true);
      setTimeout(() => {
        setSyncSuccess(false);
        window.location.reload();
      }, 1500);
    } catch (e) {
      console.error(e);
      const errMessage = e instanceof Error ? e.message : String(e);
      if (
        errMessage.includes('cancel') ||
        errMessage.includes('Cancel') ||
        errMessage.includes('auth') ||
        errMessage.includes('Auth') ||
        errMessage.includes('token') ||
        errMessage.includes('Token')
      ) {
        showToast('Authentication cancelled or failed.');
      } else {
        alert('Sync failed: ' + errMessage);
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectGoogleAccount();
      setIsConnected(false);
      showToast('Account disconnected');
    } catch (err) {
      console.error('Failed to disconnect:', err);
      alert('Failed to disconnect: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="mt-12 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 bg-red-600 text-white px-6 py-3.5 rounded-xl shadow-xl transition-all z-50 flex items-center gap-2 animate-pulse border border-red-500">
          <span>⚠️</span>
          <span className="font-semibold text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appearance Mode Card */}
        <div className="bg-[#F8F9FA] dark:bg-[#1E1E1E] p-8 rounded-3xl border border-gray-150 dark:border-[#2D2D2D]/60 shadow-sm flex flex-col justify-between transition-all hover:shadow-md md:col-span-2">
          <div>
            <h3 className="text-xl font-bold text-gray-850 dark:text-gray-200 tracking-tight flex items-center gap-2">
              {theme === 'dark' ? <Moon size={22} className="text-blue-450" /> : <Sun size={22} className="text-amber-500" />}
              Appearance Mode
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-2 leading-relaxed">
              Personalize your tracker layout. Switch between Light Mode for daytime clarity and Dark Mode for comfortable nighttime productivity.
            </p>
          </div>
          
          <div className="mt-8 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-655 dark:text-gray-300">
              Current: <span className="capitalize text-blue-600 dark:text-blue-450">{theme} Mode</span>
            </span>
            
            <button
              onClick={toggleTheme}
              className="relative inline-flex h-8 w-16 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 dark:bg-gray-700 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              role="switch"
              aria-checked={theme === 'dark'}
            >
              <span className="sr-only">Toggle Dark Mode</span>
              <span
                aria-hidden="true"
                className={`${
                  theme === 'dark' ? 'translate-x-8 bg-blue-500' : 'translate-x-0 bg-amber-500'
                } pointer-events-none inline-block h-7 w-7 transform rounded-full shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center text-white`}
              >
                {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
              </span>
            </button>
          </div>
        </div>

        {/* Google Drive Sync Panel */}
        <div className="bg-[#F8F9FA] dark:bg-[#1E1E1E] p-8 rounded-3xl border border-gray-155 dark:border-[#2D2D2D]/60 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div>
            <h3 className="text-xl font-bold text-gray-850 dark:text-gray-200 tracking-tight flex items-center gap-2">
              <span className="text-2xl" role="img" aria-label="cloud sync">🔄</span>
              Cloud Synchronization
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-2 leading-relaxed">
              Synchronize your tasks and routine history across devices using your personal Google Drive storage.
            </p>
          </div>
          
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider">Status:</span>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-green-50 dark:bg-green-955/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  Connected to Google
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                  Not Connected
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleSync}
                disabled={syncing || seeding}
                className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-widest py-4 px-6 rounded-2xl shadow-lg shadow-blue-100 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {syncing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Syncing...
                  </>
                ) : syncSuccess ? (
                  'Success! Reloading...'
                ) : (
                  'Sync with Google Drive'
                )}
              </button>
              
              {isConnected && (
                <button
                  onClick={handleDisconnect}
                  className="w-full sm:w-auto px-6 py-4 rounded-2xl border-2 border-red-500 text-red-500 hover:text-white hover:bg-red-500 font-extrabold text-xs uppercase tracking-widest transition-all active:scale-95"
                >
                  Disconnect / Switch Account
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Developer Sandbox Controls */}
        <div className="bg-[#F8F9FA] dark:bg-[#1E1E1E] p-8 rounded-3xl border border-rose-100 dark:border-rose-950/20 shadow-sm flex flex-col justify-between transition-all hover:shadow-md hover:border-rose-200 dark:hover:border-rose-900/50">
          <div>
            <h3 className="text-xl font-bold text-gray-850 dark:text-gray-200 tracking-tight flex items-center gap-2">
              <span className="text-2xl text-rose-500" role="img" aria-label="sandbox">🧪</span>
              Developer Sandbox
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-2 leading-relaxed">
              Reset and populate your local SQLite database with 90 days of random routine logs to test components.
            </p>
          </div>
          <div className="mt-8">
            <button
              onClick={handleSeed}
              disabled={seeding || syncing}
              className="w-full bg-gradient-to-r from-rose-500 to-red-600 text-white font-extrabold text-xs uppercase tracking-widest py-4 px-6 rounded-2xl shadow-lg shadow-rose-100 dark:shadow-none hover:shadow-xl hover:from-rose-600 hover:to-red-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {seeding ? 'Injecting...' : seedSuccess ? 'Success! Reloading...' : 'Inject Test Data'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsPanel;
