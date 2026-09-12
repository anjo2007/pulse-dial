import React, { useState } from 'react';
import { AlertCircle, Zap, ShieldAlert, X } from 'lucide-react';

const BLOOD_TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
const URGENCY_LEVELS = [
  { id: 'NORMAL', label: 'NORMAL', desc: 'Standard emergency surgery reserve (Within 4 hrs)', color: 'border-slate-200 text-slate-700 bg-slate-50/50' },
  { id: 'URGENT', label: 'URGENT', desc: 'Active bleeding, scheduled trauma care (Within 60 min)', color: 'border-amber-400 text-amber-900 bg-amber-50/40' },
  { id: 'CRITICAL', label: 'CRITICAL', desc: 'Massive hemorrhage, trauma shock, immediate golden hour (Sub-15 min)', color: 'border-red-500 text-red-900 bg-red-50/70' },
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
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-5 text-white flex items-center justify-between shadow">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl text-white shadow-inner">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide uppercase">
                Initiate Rapid SOS Dispatch
              </h2>
              <p className="text-xs text-red-100">
                Hospital: <span className="font-bold text-white">{hospital?.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white text-slate-900">
          {/* Blood Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              1. Required Blood Group <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {BLOOD_TYPES.map((bt) => (
                <button
                  type="button"
                  key={bt}
                  onClick={() => setBloodType(bt)}
                  className={`py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-1.5 border-2 ${
                    bloodType === bt
                      ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-500/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              2. Units Required (Whole Blood Units)
            </label>
            <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <input
                type="range"
                min="1"
                max="8"
                value={unitsNeeded}
                onChange={(e) => setUnitsNeeded(Number(e.target.value))}
                className="flex-1 accent-red-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
              <span className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-base font-black text-slate-900 shadow-sm min-w-[70px] text-center">
                {unitsNeeded} {unitsNeeded === 1 ? 'Unit' : 'Units'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 pl-1">
              Tier 1 engine will automatically dispatch to <strong>{unitsNeeded * 3} candidate donors</strong> (3x multiplier) in the &le; 1 km perimeter.
            </p>
          </div>

          {/* Urgency Level */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              3. Urgency Category
            </label>
            <div className="space-y-2">
              {URGENCY_LEVELS.map((lvl) => (
                <div
                  key={lvl.id}
                  onClick={() => setUrgency(lvl.id)}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                    urgency === lvl.id
                      ? `${lvl.color} shadow-sm ring-1 ring-red-500/20`
                      : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="urgency"
                    checked={urgency === lvl.id}
                    onChange={() => setUrgency(lvl.id)}
                    className="mt-1 accent-red-600"
                  />
                  <div>
                    <div className="font-bold text-sm text-slate-900">{lvl.label}</div>
                    <div className="text-xs text-slate-500">{lvl.desc}</div>
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
              className="w-full py-4 bg-gradient-to-r from-red-600 via-red-500 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-red-500/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Zap className="w-5 h-5 fill-white" />
              <span>{isSubmitting ? 'Dispatching...' : 'Broadcast Tier 1 Radial Dispatch'}</span>
            </button>
            <div className="text-center mt-2.5">
              <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                Sub-5ms Geohash indexing. High-priority call alert siren will wake matched donors.
              </span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
