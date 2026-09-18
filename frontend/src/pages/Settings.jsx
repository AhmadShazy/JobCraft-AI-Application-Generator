import { useState, useEffect, useCallback } from 'react';
import { listSessions, revokeSession, revokeOtherSessions } from '../api/client';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, Sun, Moon, Loader2, Monitor, Smartphone, ShieldCheck, LogOut, Trash2 } from 'lucide-react';

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function deviceIcon(device) {
  const d = (device || '').toLowerCase();
  if (d.includes('ios') || d.includes('android')) return Smartphone;
  return Monitor;
}

function Settings({ onBackToDashboard, onLoggedOutSelf, darkMode, toggleDarkMode }) {
  const { addToast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busySid, setBusySid] = useState(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listSessions();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.detail || 'Failed to load your active devices.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const handleRevoke = async (session) => {
    setBusySid(session.sid);
    try {
      await revokeSession(session.sid);
      if (session.current) {
        // Revoking the current device signs this session out entirely.
        addToast('You have been signed out of this device.', 'success');
        onLoggedOutSelf?.();
        return;
      }
      addToast('Device signed out.', 'success');
      setSessions((prev) => prev.filter((s) => s.sid !== session.sid));
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.detail || 'Failed to sign out that device.', 'error');
    } finally {
      setBusySid(null);
    }
  };

  const handleRevokeOthers = async () => {
    setRevokingOthers(true);
    try {
      const res = await revokeOtherSessions();
      addToast(res.revoked ? 'Signed out of all other devices.' : 'No other devices to sign out.', 'success');
      setSessions((prev) => prev.filter((s) => s.current));
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.detail || 'Failed to sign out other devices.', 'error');
    } finally {
      setRevokingOthers(false);
    }
  };

  const otherCount = sessions.filter((s) => !s.current).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-4 px-6 flex items-center justify-between flex-shrink-0 z-10 shadow-md transition-colors duration-200">
        <div className="flex items-center gap-3">
          <button onClick={onBackToDashboard} className="p-2 text-slate-600 dark:text-slate-300 hover:text-primary-800 dark:hover:text-white transition-colors bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-accent-500/30 dark:hover:border-accent-500/50 rounded-xl shadow-sm cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-accent-600 dark:text-accent-400" />
          </button>
          <div>
            <h1 className="text-lg font-extrabold flex items-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-accent-600 dark:text-accent-400" />
              <span className="bg-gradient-to-r from-primary-800 to-accent-600 dark:from-white dark:to-accent-300 bg-clip-text text-transparent">
                Security &amp; Devices
              </span>
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Manage where you are signed in</p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleDarkMode}
          className="flex items-center justify-center p-2.5 text-slate-600 dark:text-slate-300 hover:text-primary-800 dark:hover:text-white bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-accent-500/30 dark:hover:border-accent-500/50 rounded-xl transition-all duration-200 shadow-sm cursor-pointer"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-accent-500" />}
        </button>
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto max-w-3xl w-full mx-auto p-6">
        <div className="bg-cyan-100/40 dark:bg-slate-900/40 backdrop-blur-md border border-accent-200/60 dark:border-slate-800 border-t-4 border-t-accent-500 p-6 rounded-2xl shadow-md space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">Active Sessions</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                Each device that is signed in appears here. Sign out any you don't recognize.
              </p>
            </div>
            {otherCount > 0 && (
              <button
                onClick={handleRevokeOthers}
                disabled={revokingOthers}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                {revokingOthers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                Sign out all other devices
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Loading your devices…</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500 font-bold text-sm">No active sessions found.</div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => {
                const Icon = deviceIcon(s.device);
                return (
                  <div
                    key={s.sid}
                    className={`flex items-center justify-between gap-4 p-4 rounded-xl border transition-colors ${
                      s.current
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg ${s.current ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          <span className="truncate">{s.device}</span>
                          {s.current && (
                            <span className="text-[10px] uppercase tracking-wide font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">
                              This device
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold truncate">
                          {s.ip ? `${s.ip} · ` : ''}Last active {formatWhen(s.last_used_at)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(s)}
                      disabled={busySid === s.sid}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-300 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800 rounded-lg transition-all disabled:opacity-50 flex-shrink-0 cursor-pointer"
                      title={s.current ? 'Sign out this device' : 'Sign out this device'}
                    >
                      {busySid === s.sid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      {s.current ? 'Sign out' : 'Remove'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Settings;
