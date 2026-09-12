import React, { useState } from 'react';
import { X, Heart, Shield, CheckCircle2, User, Phone, Lock, Calendar, Activity, AlertCircle } from 'lucide-react';

export default function DonorRegisterModal({ isOpen, onClose, onRegisterSuccess }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+91-');
  const [password, setPassword] = useState('');
  const [bloodType, setBloodType] = useState('O-');
  const [age, setAge] = useState('27');
  const [weightKg, setWeightKg] = useState('68');
  const [lastDonationDate, setLastDonationDate] = useState('');
  const [isFirstTimeDonor, setIsFirstTimeDonor] = useState(false);
  const [medications, setMedications] = useState('None');
  const [diseases, setDiseases] = useState('None (Healthy)');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !phone.trim() || !password) {
      setError('Please provide full name, phone number, and password.');
      return;
    }

    if (parseInt(weightKg) < 50) {
      setError('Clinical standard: Minimum eligible donor weight is 50 kg.');
      return;
    }

    if (parseInt(age) < 18 || parseInt(age) > 65) {
      setError('Clinical standard: Eligible age range for blood donation is 18 - 65.');
      return;
    }

    setLoading(true);
    try {
      const donorData = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        password,
        blood_type: bloodType,
        age: parseInt(age),
        weight_kg: parseInt(weightKg),
        last_donation_date: isFirstTimeDonor || !lastDonationDate.trim() ? 'Never Donated' : lastDonationDate.trim(),
        medications: medications.trim() || 'None',
        diseases: diseases.trim() || 'None (Healthy)',
      };

      await onRegisterSuccess(donorData);
      onClose();
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 relative my-8 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-red-100 border border-red-200 rounded-2xl flex items-center justify-center text-red-600">
            <Heart className="w-6 h-6 fill-red-600 text-red-600" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Register Citizen Donor</h3>
            <p className="text-xs text-slate-500 font-medium">Syncs directly into Firestore Emergency Network</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Blood Group *
              </label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-red-600 focus:bg-white focus:border-red-500 focus:outline-none"
              >
                {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg} {bg === 'O-' ? '(Universal Donor)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  placeholder="+91-9900000001"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Age (18-65) *
              </label>
              <input
                type="number"
                min="18"
                max="65"
                required
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Weight (kg, ≥50) *
              </label>
              <input
                type="number"
                min="50"
                max="160"
                required
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Last Blood Donated Date
              </label>
              <button
                type="button"
                onClick={() => {
                  const nextState = !isFirstTimeDonor;
                  setIsFirstTimeDonor(nextState);
                  if (nextState) setLastDonationDate('');
                }}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border transition flex items-center gap-1 ${
                  isFirstTimeDonor
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {isFirstTimeDonor ? '✓ First-Time Donor' : '+ First-Time Donor (Never Donated)'}
              </button>
            </div>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="date"
                disabled={isFirstTimeDonor}
                max={new Date().toISOString().split('T')[0]}
                min="1990-01-01"
                value={lastDonationDate}
                onChange={(e) => {
                  setLastDonationDate(e.target.value);
                  if (e.target.value) setIsFirstTimeDonor(false);
                }}
                onClick={(e) => e.target.showPicker && e.target.showPicker()}
                className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-red-500 focus:outline-none cursor-pointer ${
                  isFirstTimeDonor ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400' : ''
                }`}
              />
            </div>
            {isFirstTimeDonor ? (
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                ✓ First-time donor selected (immediately eligible for emergency dispatch).
              </span>
            ) : lastDonationDate ? (
              <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                Selected date: {lastDonationDate}. 90-day clinical cooldown is automatically calculated.
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 mt-1 block">
                Pick a date from the calendar, or tap &quot;First-Time Donor&quot; if never donated.
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Current Medications
            </label>
            <input
              type="text"
              placeholder="e.g. None or Blood pressure, allergy meds"
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Chronic Diseases / Medical History
            </label>
            <input
              type="text"
              placeholder="e.g. None (Healthy) or Diabetes, Asthma"
              value={diseases}
              onChange={(e) => setDiseases(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-red-500 focus:outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-lg shadow-red-500/30 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
            >
              {loading ? (
                <span>Registering in Firestore...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Register & Add to Network</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
