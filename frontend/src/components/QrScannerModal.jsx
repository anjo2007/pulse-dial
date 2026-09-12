import React, { useState, useEffect } from 'react';
import { QrCode, CheckCircle2, AlertTriangle, X, Award, ShieldCheck, KeyRound, Building2 } from 'lucide-react';

export default function QrScannerModal({ isOpen, onClose, onVerifyToken, activePassToken, activeOtp }) {
  const [activeTab, setActiveTab] = useState('otp'); // 'otp' | 'qr'
  const [otpInput, setOtpInput] = useState(activeOtp || '');
  const [tokenInput, setTokenInput] = useState(activePassToken || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (activeOtp) {
      setOtpInput(activeOtp);
      setActiveTab('otp');
    }
    if (activePassToken) {
      setTokenInput(activePassToken);
      if (!activeOtp) setActiveTab('qr');
    }
    setError(null);
    setResult(null);
  }, [isOpen, activeOtp, activePassToken]);

  if (!isOpen) return null;

  const handleVerifyOtp = async () => {
    const raw = otpInput.replace(/\s+/g, '');
    if (raw.length < 6) {
      setError('Please enter the full 6-digit Arrival OTP provided by the donor.');
      return;
    }
    await executeVerify(raw);
  };

  const handleVerifyQr = async () => {
    if (!tokenInput.trim()) {
      setError('Please paste or scan a valid QR arrival pass token.');
      return;
    }
    await executeVerify(tokenInput.trim());
  };

  const executeVerify = async (queryParam) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await onVerifyToken(queryParam);
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
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-2xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900">Hospital Reception Arrival Desk</h3>
              <p className="text-xs text-slate-500">Authenticate donor physical arrival & credit +15 Karma</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 bg-white text-slate-900">
          {/* Mode Switcher: 6-Digit OTP vs QR Code */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setActiveTab('otp'); setError(null); }}
              className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-2 ${
                activeTab === 'otp' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-4 h-4 text-emerald-600" />
              <span>6-Digit Arrival OTP</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('qr'); setError(null); }}
              className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-2 ${
                activeTab === 'qr' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span>Scan QR Pass</span>
            </button>
          </div>

          {/* TAB 1: 6-DIGIT OTP VERIFICATION */}
          {activeTab === 'otp' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Enter Donor 6-Digit Arrival OTP
                </label>
                <input
                  type="text"
                  maxLength={7}
                  placeholder="e.g. 839 201"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-2xl font-black font-mono tracking-widest text-center text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                />
                <span className="text-[11px] text-slate-400 block mt-1.5 text-center">
                  Provided by the donor upon physical arrival at hospital reception desk
                </span>
              </div>

              {activeOtp && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-900">En Route Donor OTP: <strong>{activeOtp}</strong></span>
                  <button
                    type="button"
                    onClick={() => { setOtpInput(activeOtp); }}
                    className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-700 rounded-lg font-bold text-[11px]"
                  >
                    Auto-Fill
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={loading}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>{loading ? 'Validating...' : 'Verify OTP & Confirm Arrival'}</span>
              </button>
            </div>
          )}

          {/* TAB 2: QR CODE TOKEN INPUT */}
          {activeTab === 'qr' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Pass Payload / QR Token String
                </label>
                <textarea
                  rows={3}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Scan QR or paste pass token string..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                />
              </div>

              {activePassToken && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-blue-900 truncate max-w-[240px]">Detected: {activePassToken}</span>
                  <button
                    type="button"
                    onClick={() => { setTokenInput(activePassToken); }}
                    className="px-2.5 py-1 bg-white border border-blue-300 text-blue-700 rounded-lg font-bold text-[11px]"
                  >
                    Auto-Fill
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleVerifyQr}
                disabled={loading}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <QrCode className="w-5 h-5" />
                <span>{loading ? 'Authenticating...' : 'Authenticate QR Pass'}</span>
              </button>
            </div>
          )}

          {/* Success Card */}
          {result && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 animate-in zoom-in-95">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{result.message || 'Arrival Confirmed & Authenticated!'}</span>
              </div>
              <div className="text-xs text-slate-700 space-y-1.5 pt-2 border-t border-emerald-200">
                <div>
                  Donor: <strong className="text-slate-900">{result.donor?.name}</strong> &bull; Group: <span className="px-1.5 py-0.5 bg-red-100 text-red-700 font-bold rounded">{result.donor?.bloodType || 'B-'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-900 font-semibold">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>Reliability Karma Credited:</span>
                  <span className="font-mono text-emerald-700 font-bold">
                    +15 Points (Score: {result.donor?.newScore || 155})
                  </span>
                </div>
                <div className="text-slate-600">
                  Emergency Unit Status:{' '}
                  <strong className="text-slate-900">
                    {result.emergencyRequest?.units_collected ?? 1} / {result.emergencyRequest?.units_required ?? 2} Units
                  </strong>{' '}
                  ({result.emergencyRequest?.status || 'ACTIVE'})
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
