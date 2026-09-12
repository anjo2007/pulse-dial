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
  Phone,
  PhoneCall,
  PhoneOff,
  UserCheck,
  Building2,
  Radio,
} from 'lucide-react';

// Web Audio API realistic emergency telephone ringtone synthesizer
class EmergencyCallRingtone {
  constructor() {
    this.audioCtx = null;
    this.intervalId = null;
    this.isPlaying = false;
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('AudioContext not supported', e);
      return;
    }

    const playRingBurst = () => {
      if (!this.isPlaying || !this.audioCtx) return;
      try {
        const now = this.audioCtx.currentTime;

        // Dual-tone multi-frequency emergency ring (480 Hz + 440 Hz)
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.setValueAtTime(0.3, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.3);
        osc2.stop(now + 1.3);
      } catch (e) {
        console.warn('Ring burst error', e);
      }
    };

    playRingBurst();
    this.intervalId = setInterval(playRingBurst, 2600);
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch (e) {}
      this.audioCtx = null;
    }
  }
}

const ringtonePlayer = new EmergencyCallRingtone();

export default function DonorMobileSimulator({
  donor,
  activeEmergency,
  onToggleAvailability,
  onRespond,
  onArrivalVerified,
}) {
  const [isAvailable, setIsAvailable] = useState(donor?.is_available ?? true);
  const [incomingCall, setIncomingCall] = useState(false);
  const [callConnected, setCallConnected] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
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

  useEffect(() => {
    if (donor) {
      setIsAvailable(donor.is_available);
    }
  }, [donor]);

  // Handle incoming emergency call trigger
  useEffect(() => {
    if (activeEmergency && isAvailable && !qrPass && !callConnected) {
      setIncomingCall(true);
      if (soundEnabled) {
        ringtonePlayer.start();
      }
    } else {
      ringtonePlayer.stop();
    }

    return () => ringtonePlayer.stop();
  }, [activeEmergency, isAvailable, qrPass, callConnected, soundEnabled]);

  // Call duration counter when answered
  useEffect(() => {
    let timer = null;
    if (callConnected) {
      timer = setInterval(() => {
        setCallSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callConnected]);

  // Generate QR image when pass is received
  useEffect(() => {
    if (qrPass?.token) {
      QRCode.toDataURL(qrPass.token, {
        width: 200,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
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

  const handleAnswerCall = () => {
    ringtonePlayer.stop();
    setIncomingCall(false);
    setCallConnected(true);
    setCallSeconds(1);

    // After a brief 2.5s dispatch voice confirmation, prompt the medical checklist
    setTimeout(() => {
      setShowPreScreening(true);
    }, 2400);
  };

  const handleDeclineCall = async () => {
    ringtonePlayer.stop();
    setIncomingCall(false);
    setCallConnected(false);
    if (onRespond && activeEmergency && donor) {
      await onRespond(activeEmergency.id, donor.id, 'DECLINED');
    }
  };

  const handleConfirmPreScreen = async () => {
    setShowPreScreening(false);
    setCallConnected(false);
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
      <div className="relative w-[340px] h-[670px] bg-white border-[8px] border-slate-800 rounded-[44px] shadow-2xl overflow-hidden flex flex-col select-none ring-1 ring-slate-900/10 text-slate-900">
        {/* Android Notch / Speaker */}
        <div className="absolute top-2 inset-x-0 flex justify-center z-50">
          <div className="w-24 h-4 bg-slate-900 rounded-full flex items-center justify-center">
            <div className="w-10 h-1 bg-slate-700 rounded-full"></div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="pt-4 px-6 pb-2 flex justify-between items-center text-[10px] text-slate-500 font-mono z-40 bg-slate-100/90 backdrop-blur-sm border-b border-slate-200">
          <span className="font-semibold text-slate-700">10:24 AM</span>
          <div className="flex items-center gap-1.5">
            <span>5G</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>98%</span>
          </div>
        </div>

        {/* App Bar */}
        <div className="px-5 py-3 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-600 fill-red-600" />
            <span className="font-black text-sm tracking-wide text-slate-900">Pulse Dial</span>
            <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">Donor</span>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-slate-500 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100"
            title={soundEnabled ? 'Emergency Siren Sound ON' : 'Emergency Siren Sound MUTED'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50">
          {/* Donor Profile Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border-2 border-red-200 flex items-center justify-center text-red-600 font-black text-xl shadow-inner">
                {donor?.blood_type || 'O-'}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-slate-900 truncate">{donor?.full_name || 'Arjun Menon'}</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-semibold text-slate-600">
                    Karma Score: <strong className="text-slate-900 font-bold">{donor?.reliability_score || 140}</strong> / 150
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Availability Toggle */}
          <div
            className={`p-3.5 rounded-2xl border transition ${
              isAvailable
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold block text-slate-900">Emergency Radar Status</span>
                <span className="text-[11px] text-slate-500">
                  {isAvailable ? 'Active for Rapid SOS Dispatch' : 'Offline / Standby'}
                </span>
              </div>
              <button
                onClick={handleToggle}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                  isAvailable ? 'bg-emerald-600' : 'bg-slate-300'
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
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                90-Day Medical Cooldown
              </span>
              <span className="text-[11px] font-mono text-emerald-700 font-bold">
                {donor?.remaining_cooldown_days === 0
                  ? '100% READY'
                  : `${donor?.remaining_cooldown_days || 0}d remaining`}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
              <div
                className={`h-full rounded-full transition-all ${
                  donor?.remaining_cooldown_days === 0 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{
                  width: donor?.remaining_cooldown_days === 0
                    ? '100%'
                    : `${Math.max(10, ((90 - (donor?.remaining_cooldown_days || 0)) / 90) * 100)}%`,
                }}
              ></div>
            </div>
            <p className="text-[11px] text-slate-500">
              {donor?.remaining_cooldown_days === 0
                ? '✅ Medical Cooldown Met: Whole Blood Ready'
                : `⏳ Cooldown Active: ${donor?.remaining_cooldown_days} days until next donation`}
            </p>
          </div>

          {/* Connected Call Banner if active */}
          {callConnected && !qrPass && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3 animate-in fade-in">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center animate-pulse">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-blue-950 flex items-center justify-between">
                  <span>Connected to Dispatch</span>
                  <span className="font-mono text-blue-700">00:{String(callSeconds).padStart(2, '0')}</span>
                </div>
                <div className="text-[11px] text-blue-700">
                  Apollo Emergency Doctor on line: Opening safety checklist...
                </div>
              </div>
            </div>
          )}

          {/* Active QR Pass Card if accepted */}
          {qrPass && (
            <div className="bg-white border-2 border-emerald-500 rounded-2xl p-4 space-y-3 shadow-md animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-emerald-700 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Pass Verified: En Route
                </span>
                <span className="text-[10px] text-slate-500">Expires in 60m</span>
              </div>

              {qrDataUrl && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-center shadow-inner">
                  <img src={qrDataUrl} alt="Arrival QR Pass" className="w-36 h-36" />
                </div>
              )}

              <div className="text-center">
                <span className="text-xs font-bold text-slate-900 block">Present Pass at Hospital Reception</span>
                <span className="text-[11px] text-emerald-700 font-semibold">+15 Karma points auto-credited upon scan</span>
              </div>

              {/* Fast Simulator trigger button */}
              <button
                onClick={() => onArrivalVerified && onArrivalVerified(qrPass.token)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Simulate Scan in Hospital Portal</span>
              </button>
            </div>
          )}

          {/* Test Trigger Button */}
          {!activeEmergency && !qrPass && !incomingCall && (
            <div className="pt-2 text-center">
              <button
                onClick={() => {
                  setIncomingCall(true);
                  if (soundEnabled) ringtonePlayer.start();
                }}
                className="text-xs text-red-600 hover:text-red-700 font-bold underline font-mono flex items-center justify-center gap-1 mx-auto"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Simulate Incoming Emergency Call</span>
              </button>
            </div>
          )}
        </div>

        {/* ========================================================== */}
        {/* FULL-SCREEN INCOMING EMERGENCY DISPATCH CALL SCREEN */}
        {/* ========================================================== */}
        {incomingCall && (
          <div className="absolute inset-0 bg-gradient-to-b from-red-950 via-slate-950 to-red-950 text-white z-50 p-6 flex flex-col justify-between animate-in slide-in-from-bottom duration-300">
            {/* Top Call Info */}
            <div className="text-center pt-8 space-y-2">
              <span className="px-3 py-1 bg-red-600/80 text-white rounded-full text-[11px] font-black uppercase tracking-widest border border-red-400/40 inline-flex items-center gap-1 shadow-lg animate-pulse">
                <Radio className="w-3 h-3 text-white animate-spin" />
                INCOMING EMERGENCY DISPATCH CALL
              </span>
              <h3 className="text-xl font-black text-white pt-2 leading-tight">
                {activeEmergency?.hospital_name || 'Apollo Trauma Center & Blood Bank'}
              </h3>
              <p className="text-xs text-red-200">
                Verified Medical Trauma Unit &bull; +91-9876543210
              </p>
            </div>

            {/* Pulsing Emergency Caller Avatar */}
            <div className="my-auto flex flex-col items-center justify-center space-y-5">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-28 h-28 bg-red-500 rounded-full animate-ping opacity-30"></div>
                <div className="absolute w-36 h-36 bg-red-600 rounded-full animate-ping opacity-15"></div>
                <div className="w-24 h-24 bg-gradient-to-tr from-red-700 to-rose-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-white/30 call-pulse">
                  <Building2 className="w-12 h-12 text-white" />
                </div>
              </div>

              {/* Call Details Card */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 w-full text-center space-y-1 shadow-lg">
                <div className="text-[11px] uppercase tracking-wider text-red-200 font-bold">
                  CRITICAL REQUEST DETAILS
                </div>
                <div className="text-base font-black text-white flex items-center justify-center gap-2">
                  <span>🩸 Blood Group:</span>
                  <span className="px-2.5 py-0.5 bg-red-600 text-white rounded-lg font-mono">
                    {activeEmergency?.blood_type || donor?.blood_type || 'O-'}
                  </span>
                </div>
                <div className="text-xs text-slate-300 pt-1">
                  Location: <strong className="text-white">0.8 km</strong> &bull; ETA:{' '}
                  <strong className="text-emerald-400">~4 mins drive</strong>
                </div>
              </div>
            </div>

            {/* Call Action Buttons: Green Answer & Red Decline */}
            <div className="space-y-4 pb-6">
              <div className="flex items-center justify-around">
                {/* Decline Button */}
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    onClick={handleDeclineCall}
                    className="w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-xl shadow-red-900/60 active:scale-95 transition"
                  >
                    <PhoneOff className="w-7 h-7" />
                  </button>
                  <span className="text-[11px] font-semibold text-slate-300">Decline</span>
                </div>

                {/* Answer Call Button */}
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    onClick={handleAnswerCall}
                    className="w-20 h-20 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-600/50 active:scale-95 transition animate-bounce"
                  >
                    <Phone className="w-9 h-9" />
                  </button>
                  <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                    Answer Call
                  </span>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 pt-2">
                High-priority medical bypass &bull; Custom emergency frequency active
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* 4-QUESTION CLINICAL MEDICAL PRE-SCREENING MODAL */}
        {/* ========================================================== */}
        {showPreScreening && (
          <div className="absolute inset-0 bg-white text-slate-900 z-50 p-5 flex flex-col justify-between animate-in fade-in">
            <div className="pt-4 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-black text-sm text-slate-900 uppercase tracking-wide">
                    Medical Pre-Screening
                  </h4>
                </div>
                <button
                  onClick={() => setShowPreScreening(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Confirm all 4 clinical criteria before generating your arrival pass:
              </p>
            </div>

            <div className="space-y-2.5 my-auto">
              <label className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/70 transition">
                <input
                  type="checkbox"
                  checked={q1}
                  onChange={(e) => setQ1(e.target.checked)}
                  className="mt-0.5 accent-emerald-600 h-4 w-4"
                />
                <span className="text-xs text-slate-800 font-medium">
                  1. Free of fever, colds, or active infection in past 14 days
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/70 transition">
                <input
                  type="checkbox"
                  checked={q2}
                  onChange={(e) => setQ2(e.target.checked)}
                  className="mt-0.5 accent-emerald-600 h-4 w-4"
                />
                <span className="text-xs text-slate-800 font-medium">
                  2. No alcohol consumption in the past 24 hours
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/70 transition">
                <input
                  type="checkbox"
                  checked={q3}
                  onChange={(e) => setQ3(e.target.checked)}
                  className="mt-0.5 accent-emerald-600 h-4 w-4"
                />
                <span className="text-xs text-slate-800 font-medium">
                  3. Not on antibiotics or restricted blood medication
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/70 transition">
                <input
                  type="checkbox"
                  checked={q4}
                  onChange={(e) => setQ4(e.target.checked)}
                  className="mt-0.5 accent-emerald-600 h-4 w-4"
                />
                <span className="text-xs text-slate-800 font-medium">
                  4. Minimum body weight met (&ge; 50 kg / 110 lbs)
                </span>
              </label>
            </div>

            <div className="pb-4">
              <button
                disabled={!allPreScreenPassed}
                onClick={handleConfirmPreScreen}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-600/20"
              >
                Confirm & Generate En Route Pass
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
