import React, { useState } from 'react';
import { QrCode, CheckCircle2, AlertTriangle, X, Award, ShieldCheck } from 'lucide-react';

export default function QrScannerModal({ isOpen, onClose, onVerifyToken, activePassToken }) {
  const [tokenInput, setTokenInput] = useState(activePassToken || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleVerify = async (tokenToUse) => {
    const rawToken = tokenToUse || tokenInput;
    if (!rawToken.trim()) {
      setError('Please paste or scan a valid arrival pass token.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await onVerifyToken(rawToken.trim());
      if (res.error) {
        setError(res.error);
      } else {
        setResult(res);
      }
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-slate-800/80 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Donor Arrival QR Scanner</h3>
              <p className="text-xs text-slate-400">Authenticate cryptographic arrival pass & award +15 Karma</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Quick Auto-Fill / Fast Scanner helper */}
          {activePassToken && (
            <div className="p-3.5 bg-blue-950/40 border border-blue-600/30 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-blue-300 block">Detected Active Donor Pass</span>
                <span className="text-[11px] text-blue-400/80 font-mono truncate max-w-[240px] block">
                  {activePassToken.substring(0, 32)}...
                </span>
              </div>
              <button
                onClick={() => {
                  setTokenInput(activePassToken);
                  handleVerify(activePassToken);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow"
              >
                1-Click Scan Pass
              </button>
            </div>
          )}

          {/* Scanner Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Pass Payload / Token String
            </label>
            <textarea
              rows={3}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste Base64 cryptographic QR payload or scan barcode..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <button
            onClick={() => handleVerify(tokenInput)}
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{loading ? 'Authenticating...' : 'Authenticate & Confirm Arrival'}</span>
          </button>

          {/* Success Card */}
          {result && (
            <div className="p-4 bg-emerald-950/50 border border-emerald-500/50 rounded-xl space-y-2 animate-in zoom-in-95">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>{result.message || 'Pass Authenticated Successfully!'}</span>
              </div>
              <div className="text-xs text-slate-300 space-y-1 pt-1 border-t border-emerald-800/40">
                <div>
                  Donor: <strong className="text-white">{result.donor?.name}</strong>
                </div>
                <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Reliability Score Credited:</span>
                  <span className="font-mono text-white">
                    {result.donor?.previousScore} &rarr;{' '}
                    <strong className="text-emerald-400 font-bold">{result.donor?.newScore}</strong> (+15 pts)
                  </span>
                </div>
                <div className="text-slate-400">
                  Emergency Unit Status:{' '}
                  <span className="text-white font-semibold">
                    {result.emergencyRequest?.units_collected} / {result.emergencyRequest?.units_needed} Units Collected
                  </span>{' '}
                  ({result.emergencyRequest?.status})
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-xl text-xs text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block">Authentication Denied:</strong>
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
