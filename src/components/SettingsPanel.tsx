import { useState, useEffect } from 'react';
import { seedTestData } from '../seedDatabase';
import { syncWithGDrive } from '../services/syncEngine';
import Database from '@tauri-apps/plugin-sql';
import { disconnectGoogleAccount } from '../services/authService';

const SettingsPanel = () => {
  const [seeding, setSeeding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const checkConnection = async () => {
    try {
      const db = await Database.load('sqlite:routine_data.db');
      const rows: { value: string }[] = await db.select(
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
        {/* Google Drive Sync Panel */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div>
            <h3 className="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
              <span className="text-2xl" role="img" aria-label="cloud sync">🔄</span>
              Cloud Synchronization
            </h3>
            <p className="text-sm text-gray-500 font-medium mt-2 leading-relaxed">
              Synchronize your tasks and routine history across devices using your personal Google Drive storage.
            </p>
          </div>
          
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status:</span>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  Connected to Google
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-50 text-gray-500 border border-gray-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                  Not Connected
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleSync}
                disabled={syncing || seeding}
                className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-widest py-4 px-6 rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
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
        <div className="bg-white p-8 rounded-3xl border border-rose-100 shadow-sm flex flex-col justify-between transition-all hover:shadow-md hover:border-rose-200">
          <div>
            <h3 className="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
              <span className="text-2xl text-rose-500" role="img" aria-label="sandbox">🧪</span>
              Developer Sandbox
            </h3>
            <p className="text-sm text-gray-500 font-medium mt-2 leading-relaxed">
              Reset and populate your local SQLite database with 90 days of random routine logs to test components.
            </p>
          </div>
          <div className="mt-8">
            <button
              onClick={handleSeed}
              disabled={seeding || syncing}
              className="w-full bg-gradient-to-r from-rose-500 to-red-600 text-white font-extrabold text-xs uppercase tracking-widest py-4 px-6 rounded-2xl shadow-lg shadow-rose-100 hover:shadow-xl hover:from-rose-600 hover:to-red-700 transition-all active:scale-95 disabled:opacity-50"
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
