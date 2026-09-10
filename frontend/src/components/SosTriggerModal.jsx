import React, { useState } from 'react';
import { AlertCircle, Zap, ShieldAlert, X } from 'lucide-react';

const BLOOD_TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
const URGENCY_LEVELS = [
  { id: 'NORMAL', label: 'NORMAL', desc: 'Standard emergency surgery reserve (Within 4 hrs)', color: 'border-slate-600' },
  { id: 'URGENT', label: 'URGENT', desc: 'Active bleeding, scheduled emergency procedure (Within 60 min)', color: 'border-amber-500 text-amber-400' },
  { id: 'CRITICAL', label: 'CRITICAL', desc: 'Massive hemorrhage, trauma shock, immediate golden hour (Sub-15 min)', color: 'border-red-500 text-red-400 bg-red-950/30' },
];

export default function SosTriggerModal({ isOpen, onClose, hospital, onTrigger }) {
  const [bloodType, setBloodType] = useState('O-');
  const [unitsNeeded, setUnitsNeeded] = useState(2);
  const [urgency, setUrgency] = useState('CRITICAL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onTrigger({
        hospital_id: hospital?.id,
        blood_type: bloodType,
        units_needed: unitsNeeded,
        urgency,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-red-500/50 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-red-950/50">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900/60 via-red-800/40 to-slate-900 px-6 py-5 border-b border-red-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 rounded-xl text-white shadow-lg animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-wide text-white uppercase flex items-center gap-2">
                Initiate Rapid SOS Dispatch
              </h2>
              <p className="text-xs text-red-200">
                Hospital: <span className="font-semibold text-white">{hospital?.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Blood Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              1. Required Blood Group <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {BLOOD_TYPES.map((bt) => (
                <button
                  type="button"
                  key={bt}
                  onClick={() => setBloodType(bt)}
                  className={`py-2.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-1.5 border ${
                    bloodType === bt
                      ? 'bg-red-600 text-white border-red-400 shadow-lg shadow-red-900/40'
                      : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <span className="text-xs">🩸</span>
                  <span>{bt}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Units Needed */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              2. Units Required (Whole Blood Units)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="8"
                value={unitsNeeded}
                onChange={(e) => setUnitsNeeded(Number(e.target.value))}
                className="flex-1 accent-red-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="px-4 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-lg font-black text-white min-w-[56px] text-center">
                {unitsNeeded} {unitsNeeded === 1 ? 'Unit' : 'Units'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Tier 1 engine will automatically dispatch to <strong>{unitsNeeded * 3} candidate donors</strong> (3x multiplier) in the &le; 1 km perimeter.
            </p>
          </div>

          {/* Urgency Level */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              3. Urgency Category
            </label>
            <div className="space-y-2">
              {URGENCY_LEVELS.map((lvl) => (
                <div
                  key={lvl.id}
                  onClick={() => setUrgency(lvl.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                    urgency === lvl.id
                      ? `bg-slate-800/90 border-2 ${lvl.color}`
                      : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="urgency"
                    checked={urgency === lvl.id}
                    onChange={() => setUrgency(lvl.id)}
                    className="mt-1 accent-red-500"
                  />
                  <div>
                    <div className="font-bold text-sm text-slate-100">{lvl.label}</div>
                    <div className="text-xs text-slate-400">{lvl.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Trigger */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-red-600 via-red-500 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-xl shadow-red-950/60 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Zap className="w-5 h-5 fill-white" />
              <span>{isSubmitting ? 'Dispatching...' : 'Broadcast Tier 1 Radial Dispatch'}</span>
            </button>
            <div className="text-center mt-2">
              <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                Sub-5ms Geohash indexing. FCM high-priority siren wakeups will trigger immediately.
              </span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
