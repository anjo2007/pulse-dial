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
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-2xl">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900">Donor Arrival QR Scanner</h3>
              <p className="text-xs text-slate-500">Authenticate cryptographic pass & award +15 Karma</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 bg-white text-slate-900">
          {/* Quick Auto-Fill / Fast Scanner helper */}
          {activePassToken && (
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-950 block">Detected Active Donor Pass</span>
                <span className="text-[11px] text-blue-700 font-mono truncate max-w-[220px] block">
                  {activePassToken.substring(0, 32)}...
                </span>
              </div>
              <button
                onClick={() => {
                  setTokenInput(activePassToken);
                  handleVerify(activePassToken);
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                1-Click Scan Pass
              </button>
            </div>
          )}

          {/* Scanner Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Pass Payload / Token String
            </label>
            <textarea
              rows={3}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste Base64 cryptographic QR payload or scan barcode..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
            />
          </div>

          <button
            onClick={() => handleVerify(tokenInput)}
            disabled={loading}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>{loading ? 'Authenticating...' : 'Authenticate & Confirm Arrival'}</span>
          </button>

          {/* Success Card */}
          {result && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 animate-in zoom-in-95">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{result.message || 'Pass Authenticated Successfully!'}</span>
              </div>
              <div className="text-xs text-slate-700 space-y-1 pt-2 border-t border-emerald-200">
                <div>
                  Donor: <strong className="text-slate-900">{result.donor?.name}</strong>
                </div>
                <div className="flex items-center gap-1.5 text-amber-900 font-semibold">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>Reliability Score Credited:</span>
                  <span className="font-mono text-slate-900">
                    {result.donor?.previousScore} &rarr;{' '}
                    <strong className="text-emerald-700 font-bold">{result.donor?.newScore}</strong> (+15 pts)
                  </span>
                </div>
                <div className="text-slate-600">
                  Emergency Unit Status:{' '}
                  <span className="text-slate-900 font-semibold">
                    {result.emergencyRequest?.units_collected} / {result.emergencyRequest?.units_needed} Units Collected
                  </span>{' '}
                  ({result.emergencyRequest?.status})
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Authentication Denied:</strong>
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
