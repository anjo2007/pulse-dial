import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Heart,
  Shield,
  Activity,
  AlertOctagon,
  CheckCircle,
  XCircle,
  Clock,
  Compass,
  QrCode,
  Volume2,
  VolumeX,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

// Web Audio API emergency siren synthesizer
function playEmergencyTone() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1400, audioCtx.currentTime + 0.3);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.6);

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.9);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.9);
  } catch (e) {
    console.warn('Audio playback restricted', e);
  }
}

export default function DonorMobileSimulator({
  donor,
  activeEmergency,
  onToggleAvailability,
  onRespond,
  onArrivalVerified,
}) {
  const [isAvailable, setIsAvailable] = useState(donor?.is_available ?? true);
  const [showSosAlert, setShowSosAlert] = useState(false);
  const [showPreScreening, setShowPreScreening] = useState(false);
  const [qrPass, setQrPass] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // 4 Pre-screening questions state
  const [q1, setQ1] = useState(false);
  const [q2, setQ2] = useState(false);
  const [q3, setQ3] = useState(false);
  const [q4, setQ4] = useState(false);

  const allPreScreenPassed = q1 && q2 && q3 && q4;

  // Sync donor availability
  useEffect(() => {
    if (donor) {
      setIsAvailable(donor.is_available);
    }
  }, [donor]);

  // Detect incoming SOS notification for this donor
  useEffect(() => {
    if (activeEmergency && isAvailable && !qrPass) {
      setShowSosAlert(true);
      if (soundEnabled) {
        playEmergencyTone();
      }
    }
  }, [activeEmergency, isAvailable]);

  // Generate QR image when pass is received
  useEffect(() => {
    if (qrPass?.token) {
      QRCode.toDataURL(qrPass.token, {
        width: 200,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      })
        .then((url) => setQrDataUrl(url))
        .catch(console.error);
    }
  }, [qrPass]);

  const handleToggle = async () => {
    const next = !isAvailable;
    setIsAvailable(next);
    if (onToggleAvailability && donor) {
      await onToggleAvailability(donor.id);
    }
  };

  const handleAcceptSos = () => {
    setShowSosAlert(false);
    setShowPreScreening(true);
  };

  const handleDeclineSos = async () => {
    setShowSosAlert(false);
    if (onRespond && activeEmergency && donor) {
      await onRespond(activeEmergency.id, donor.id, 'DECLINED');
    }
  };

  const handleConfirmPreScreen = async () => {
    setShowPreScreening(false);
    if (onRespond && activeEmergency && donor) {
      const res = await onRespond(activeEmergency.id, donor.id, 'ACCEPTED');
      if (res?.qrPass) {
        setQrPass(res.qrPass);
      }
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Realistic Mobile Device Frame */}
      <div className="relative w-[340px] h-[670px] bg-slate-900 border-[8px] border-slate-700 rounded-[44px] shadow-2xl overflow-hidden flex flex-col select-none ring-1 ring-white/10">
        {/* Android Notch / Speaker */}
        <div className="absolute top-2 inset-x-0 flex justify-center z-50">
          <div className="w-24 h-4 bg-slate-800 rounded-full flex items-center justify-center">
            <div className="w-10 h-1 bg-slate-950 rounded-full"></div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="pt-4 px-6 pb-2 flex justify-between items-center text-[10px] text-slate-400 font-mono z-40 bg-slate-900">
          <span>10:24 AM</span>
          <div className="flex items-center gap-1.5">
            <span>5G</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>98%</span>
          </div>
        </div>

        {/* App Bar */}
        <div className="px-5 py-3 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            <span className="font-black text-sm tracking-wide text-white">Pulse Dial</span>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-slate-400 hover:text-white p-1"
            title={soundEnabled ? 'Emergency Siren Sound ON' : 'Emergency Siren Sound MUTED'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-200">
          {/* Donor Profile Card */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 font-black text-lg shadow-inner">
                {donor?.blood_type || 'O-'}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-white truncate">{donor?.full_name || 'Arjun Menon'}</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-300">
                    Karma Score: <strong className="text-white font-bold">{donor?.reliability_score || 140}</strong> / 150
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Availability Toggle */}
          <div
            className={`p-3.5 rounded-2xl border transition ${
              isAvailable
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800/50 border-slate-700 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold block text-white">Emergency Geofence Status</span>
                <span className="text-[11px] text-slate-400">
                  {isAvailable ? 'Active for Rapid SOS Dispatch' : 'Offline / Do Not Disturb'}
                </span>
              </div>
              <button
                onClick={handleToggle}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                  isAvailable ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform shadow ${
                    isAvailable ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 90-Day Medical Cooldown Gauge */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 space-y-2.5 shadow">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                90-Day Cooldown Status
              </span>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                {donor?.remaining_cooldown_days === 0
                  ? 'READY'
                  : `${donor?.remaining_cooldown_days || 0}d left`}
              </span>
            </div>
            <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  donor?.remaining_cooldown_days === 0 ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
                style={{
                  width: donor?.remaining_cooldown_days === 0
                    ? '100%'
                    : `${Math.max(10, ((90 - (donor?.remaining_cooldown_days || 0)) / 90) * 100)}%`,
                }}
              ></div>
            </div>
            <p className="text-[11px] text-slate-400">
              {donor?.remaining_cooldown_days === 0
                ? '✅ 100% Eligible: Whole Blood Donation Ready'
                : `⏳ Cooldown Active: ${donor?.remaining_cooldown_days} days remaining`}
            </p>
          </div>

          {/* Active QR Pass Card if accepted */}
          {qrPass && (
            <div className="bg-slate-800 border-2 border-emerald-500 rounded-2xl p-4 space-y-3 animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Pass Issued: En Route
                </span>
                <span className="text-[10px] text-slate-400">Valid 60 min</span>
              </div>

              {qrDataUrl && (
                <div className="bg-white p-2.5 rounded-xl flex justify-center shadow-md">
                  <img src={qrDataUrl} alt="Arrival QR Pass" className="w-36 h-36" />
                </div>
              )}

              <div className="text-center">
                <span className="text-xs font-bold text-white block">Present Pass at Hospital Reception</span>
                <span className="text-[11px] text-emerald-400 font-medium">Automatic +15 Karma Credit on scan</span>
              </div>

              {/* Quick Simulator shortcut button */}
              <button
                onClick={() => onArrivalVerified && onArrivalVerified(qrPass.token)}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow flex items-center justify-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Simulate Scan in Hospital Portal</span>
              </button>
            </div>
          )}

          {/* Test Trigger Button */}
          {!activeEmergency && !qrPass && (
            <div className="pt-2 text-center">
              <button
                onClick={() => setShowSosAlert(true)}
                className="text-xs text-slate-400 hover:text-red-400 underline font-mono"
              >
                Simulate Device SOS Alert Screen
              </button>
            </div>
          )}
        </div>

        {/* FULL-SCREEN SOS INTERRUPTION SCREEN */}
        {showSosAlert && (
          <div className="absolute inset-0 bg-red-950 z-50 p-5 flex flex-col justify-between animate-in slide-in-from-bottom duration-300">
            <div className="text-center pt-6 space-y-2">
              <div className="w-14 h-14 bg-red-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-red-900 animate-bounce">
                <AlertOctagon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-wider">
                Emergency Blood SOS
              </h3>
              <p className="text-xs text-red-200">Tier 1 Perimeter Urgent Dispatch</p>
            </div>

            <div className="bg-slate-900/90 border border-red-500/50 rounded-2xl p-4 space-y-3 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs text-slate-400">Target Group:</span>
                <span className="px-3 py-1 bg-red-600 text-white font-black text-base rounded-xl">
                  {activeEmergency?.blood_type || donor?.blood_type || 'O-'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Hospital:</span>
                <span className="text-xs font-bold text-white block">
                  {activeEmergency?.hospital_name || 'Apollo Trauma Center & Regional Blood Bank'}
                </span>
              </div>
              <div className="flex justify-between text-xs pt-1">
                <div>
                  <span className="text-slate-400 block text-[11px]">Distance</span>
                  <strong className="text-white">0.8 km</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Estimated ETA</span>
                  <strong className="text-emerald-400">~ 4 mins</strong>
                </div>
              </div>
            </div>

            <div className="space-y-2 pb-4">
              <button
                onClick={handleAcceptSos}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition"
              >
                Accept & Start Medical Pre-Screening
              </button>
              <button
                onClick={handleDeclineSos}
                className="w-full py-2.5 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Unable to Respond (Decline)
              </button>
            </div>
          </div>
        )}

        {/* 4-QUESTION MEDICAL PRE-SCREENING MODAL */}
        {showPreScreening && (
          <div className="absolute inset-0 bg-slate-950 z-50 p-5 flex flex-col justify-between animate-in fade-in">
            <div className="pt-4 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="font-black text-sm text-white uppercase tracking-wide">
                  Medical Pre-Screening
                </h4>
                <button onClick={() => setShowPreScreening(false)} className="text-slate-400 text-xs">
                  Cancel
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Confirm all 4 clinical donor criteria before arrival QR token generation:
              </p>
            </div>

            <div className="space-y-2.5 my-auto">
              <label className="flex items-start gap-2.5 p-2.5 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={q1}
                  onChange={(e) => setQ1(e.target.checked)}
                  className="mt-0.5 accent-emerald-500"
                />
                <span className="text-xs text-slate-200">
                  1. Free of fever, colds, or infections in past 14 days
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={q2}
                  onChange={(e) => setQ2(e.target.checked)}
                  className="mt-0.5 accent-emerald-500"
                />
                <span className="text-xs text-slate-200">
                  2. No alcohol consumption in past 24 hours
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={q3}
                  onChange={(e) => setQ3(e.target.checked)}
                  className="mt-0.5 accent-emerald-500"
                />
                <span className="text-xs text-slate-200">
                  3. Not on antibiotics or restricted blood medications
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={q4}
                  onChange={(e) => setQ4(e.target.checked)}
                  className="mt-0.5 accent-emerald-500"
                />
                <span className="text-xs text-slate-200">
                  4. Minimum body weight met (&ge; 50 kg / 110 lbs)
                </span>
              </label>
            </div>

            <div className="pb-4">
              <button
                disabled={!allPreScreenPassed}
                onClick={handleConfirmPreScreen}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow"
              >
                Confirm & Generate QR Pass
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
