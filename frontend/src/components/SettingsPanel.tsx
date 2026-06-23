import { useState } from 'react';
import { seedTestData } from '../seedDatabase';
import { syncWithGDrive } from '../services/syncEngine';

const SettingsPanel = () => {
  const [seeding, setSeeding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

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
      setSyncSuccess(true);
      setTimeout(() => {
        setSyncSuccess(false);
        window.location.reload();
      }, 1500);
    } catch (e) {
      console.error(e);
      alert('Sync failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSyncing(false);
    }
  };

  const handleResetToken = () => {
    localStorage.removeItem('gdrive_access_token');
    alert('Google Drive access token reset. You will be prompted for a new one on the next sync.');
  };

  return (
    <div className="mt-12 space-y-6">
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
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
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
            <button
              onClick={handleResetToken}
              className="w-full sm:w-auto px-4 py-4 rounded-2xl border-2 border-gray-100 text-gray-400 hover:text-gray-600 font-bold text-xs uppercase tracking-wider transition-colors hover:bg-gray-50"
              title="Reset OAuth Token"
            >
              Reset Token
            </button>
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
