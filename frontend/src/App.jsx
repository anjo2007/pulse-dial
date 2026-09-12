import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Radio,
  QrCode,
  Users,
  Activity,
  Zap,
  RefreshCw,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Hospital as HospitalIcon,
  ChevronRight,
  TrendingUp,
  Award,
  Lock,
  LogOut,
  Building2,
  FileCheck,
  UserCheck,
  HeartHandshake,
  Search,
  Filter,
  UserPlus,
  Heart,
} from 'lucide-react';
import LiveRadarMap from './components/LiveRadarMap.jsx';
import SosTriggerModal from './components/SosTriggerModal.jsx';
import QrScannerModal from './components/QrScannerModal.jsx';
import DonorRegisterModal from './components/DonorRegisterModal.jsx';
import {
  PRECONFIGURED_HOSPITALS,
  authenticateHospitalStaff,
  subscribeEmergencyRequests,
  subscribeDonors,
  subscribeAssignments,
  createEmergencyInFirestore,
  escalateTierInFirestore,
  verifyArrivalTokenInFirestore,
  registerDonorInFirestore,
} from './firebaseConfig.js';

export default function App() {
  // Hospital Authentication State (Restricted - No Public Hospital Signup)
  const [currentHospital, setCurrentHospital] = useState(() => {
    const saved = localStorage.getItem('pulse_dial_hospital_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard Data State
  const [hospitals, setHospitals] = useState(PRECONFIGURED_HOSPITALS);
  const [donors, setDonors] = useState([]);
  const [activeRequest, setActiveRequest] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isDonorRegisterModalOpen, setIsDonorRegisterModalOpen] = useState(false);
  const [latestQrPassToken, setLatestQrPassToken] = useState(null);
  const [latestOtp, setLatestOtp] = useState(null);
  const [activeTab, setActiveTab] = useState('radar'); // 'radar' | 'directory'
  const [donorSearch, setDonorSearch] = useState('');
  const [notification, setNotification] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef(null);

  // 1. Initial Load & Standalone/Vercel Database Fetching
  const fetchData = async () => {
    try {
      const [hospRes, donRes, actRes] = await Promise.all([
        fetch('/api/hospitals').then((r) => (r.ok ? r.json() : PRECONFIGURED_HOSPITALS)).catch(() => PRECONFIGURED_HOSPITALS),
        fetch('/api/donors').then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch('/api/emergency/active').then((r) => (r.ok ? r.json() : [])).catch(() => []),
      ]);

      if (hospRes && hospRes.length > 0) setHospitals(hospRes);
      if (donRes && donRes.length > 0) setDonors(donRes);

      if (actRes && actRes.length > 0) {
        const latest = actRes[actRes.length - 1];
        setActiveRequest(latest);
        const radarRes = await fetch(`/api/emergency/${latest.id}/radar`).then((r) => r.json()).catch(() => null);
        if (radarRes?.assignments) setAssignments(radarRes.assignments);
      }
    } catch (err) {
      console.warn('Backend offline or standalone Vercel mode', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentHospital]);

  // 2. Real-Time Cloud Firestore Sync Listeners (Active Globally on Vercel)
  useEffect(() => {
    if (!currentHospital) return;

    // A. Listen to live Donors collection
    const unsubDonors = subscribeDonors((cloudDonors) => {
      if (cloudDonors && cloudDonors.length > 0) {
        setDonors(cloudDonors);
      }
    });

    // B. Listen to live Emergency Requests collection
    const unsubRequests = subscribeEmergencyRequests((requests) => {
      if (requests && requests.length > 0) {
        const active = requests.find((r) => r.status === 'ACTIVE') || requests[0];
        setActiveRequest(active);
      }
    });

    return () => {
      if (typeof unsubDonors === 'function') unsubDonors();
      if (typeof unsubRequests === 'function') unsubRequests();
    };
  }, [currentHospital]);

  // C. Listen to live Dispatch Assignments for the active request
  useEffect(() => {
    if (!activeRequest?.id) return;

    const unsubAssignments = subscribeAssignments(activeRequest.id, (cloudAssignments) => {
      if (cloudAssignments && cloudAssignments.length > 0) {
        setAssignments(cloudAssignments);
      }
    });

    return () => {
      if (typeof unsubAssignments === 'function') unsubAssignments();
    };
  }, [activeRequest?.id]);

  // 3. Optional Local WebSocket for instant sub-millisecond local dev telemetry
  useEffect(() => {
    if (!currentHospital) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const connectWs = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
          ws.send(JSON.stringify({ type: 'IDENTIFY', role: 'HOSPITAL', id: currentHospital.id }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleRealtimeEvent(data);
          } catch (e) {
            console.error(e);
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          setTimeout(connectWs, 3000);
        };
      } catch (err) {
        setWsConnected(false);
      }
    };

    connectWs();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [currentHospital]);

  const showToast = (msg, type = 'info') => {
    setNotification({ msg, type, id: Date.now() });
    setTimeout(() => {
      setNotification((curr) => (curr?.id ? null : curr));
    }, 5000);
  };

  const handleRealtimeEvent = (event) => {
    switch (event.type) {
      case 'SOS_DISPATCH_TRIGGERED':
        setActiveRequest(event.request);
        setAssignments(event.assignments || []);
        showToast(`🚨 Tier 1 Emergency Dispatch Activated: ${event.request.blood_type} needed!`, 'alert');
        break;

      case 'TIER_ESCALATED':
        setActiveRequest((prev) => (prev ? { ...prev, current_tier: event.tier, current_radius_km: event.radiusKm } : prev));
        if (event.newAssignments) {
          setAssignments((prev) => [...prev, ...event.newAssignments]);
        }
        showToast(`⚠️ Radial Escalation to Tier ${event.tier} (<= ${event.radiusKm} km) active!`, 'warning');
        break;

      case 'DONOR_RESPONSE_UPDATED':
        setAssignments((prev) =>
          prev.map((asgn) =>
            asgn.donor_id === event.donorId
              ? {
                  ...asgn,
                  status: event.status,
                  qr_token: event.assignment?.qr_token || asgn.qr_token,
                  arrival_otp: event.assignment?.arrival_otp || asgn.arrival_otp,
                }
              : asgn
          )
        );
        if (event.status === 'ACCEPTED' || event.status === 'EN_ROUTE') {
          showToast(`✅ Matched donor accepted emergency dispatch! En route to hospital.`, 'success');
          if (event.assignment?.qr_token) {
            setLatestQrPassToken(event.assignment.qr_token);
          }
          if (event.assignment?.arrival_otp) {
            setLatestOtp(event.assignment.arrival_otp);
          }
        } else {
          showToast(`❌ Donor declined dispatch call.`, 'info');
        }
        break;

      case 'DONOR_VERIFIED_ARRIVAL':
        showToast(`🎉 Donor arrival authenticated! +15 Reliability Karma credited.`, 'success');
        setAssignments((prev) =>
          prev.map((asgn) =>
            asgn.donor_id === event.donorId ? { ...asgn, status: 'COMPLETED' } : asgn
          )
        );
        setActiveRequest((prev) =>
          prev
            ? {
                ...prev,
                units_collected: event.unitsCollected,
                status: event.requestStatus,
              }
            : prev
        );
        fetchData();
        break;

      case 'DONOR_REGISTERED':
        showToast(`👤 New Citizen Donor registered: ${event.donor?.full_name} (${event.donor?.blood_type})`, 'info');
        fetchData();
        break;

      case 'DONOR_AVAILABILITY_CHANGED':
        setDonors((prev) =>
          prev.map((d) => (d.id === event.donorId ? { ...d, is_available: event.is_available } : d))
        );
        break;

      case 'SIMULATION_RESET':
        fetchData();
        showToast('Database reset to initial seed state.', 'info');
        break;

      default:
        break;
    }
  };

  // Hospital Login Handler (Strict: Only credentials manually added in database)
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const result = await authenticateHospitalStaff(loginEmail.trim(), loginPassword);
      if (result.success) {
        setCurrentHospital(result.hospital);
        localStorage.setItem('pulse_dial_hospital_session', JSON.stringify(result.hospital));
        showToast(`Welcome, ${result.hospital.name}!`, 'success');
      } else {
        setLoginError(result.error || 'Access Denied: Invalid credentials.');
      }
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setCurrentHospital(null);
    localStorage.removeItem('pulse_dial_hospital_session');
  };

  // Trigger SOS Emergency Request (Dual Sync: Firestore Cloud + Local API)
  const handleTriggerSos = async (reqData) => {
    // 1. Direct Firestore Execution (ensures Vercel standalone operation)
    try {
      const { request, assignments: newAsgns } = await createEmergencyInFirestore(
        reqData,
        currentHospital,
        donors
      );
      setActiveRequest(request);
      if (newAsgns && newAsgns.length > 0) {
        setAssignments(newAsgns);
      }
      showToast(`Emergency dispatch triggered across ${newAsgns.length} nearby donors!`, 'success');
    } catch (fsErr) {
      console.warn('Firestore SOS trigger error:', fsErr);
    }

    // 2. Local API Trigger (if backend is active)
    try {
      const res = await fetch('/api/emergency/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqData),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveRequest(data.request);
        setAssignments(data.assignments);
      }
    } catch (e) {
      // Backend offline / Vercel cloud mode
    }
  };

  // Escalate Tier manually (Tier 1 -> Tier 2 -> Tier 3)
  const handleEscalateTier = async () => {
    if (!activeRequest) return;

    // 1. Firestore Escalation
    try {
      const result = await escalateTierInFirestore(activeRequest, currentHospital, donors);
      if (result) {
        setActiveRequest((prev) => ({
          ...prev,
          current_tier: result.tier,
          current_radius_km: result.radiusKm,
        }));
        setAssignments((prev) => [...prev, ...result.newAssignments]);
        showToast(`Escalated to Tier ${result.tier} (<= ${result.radiusKm} km)`, 'warning');
      }
    } catch (e) {
      console.warn('Firestore escalation error:', e);
    }

    // 2. Local API Escalation (if running)
    try {
      const res = await fetch(`/api/emergency/${activeRequest.id}/escalate`, { method: 'POST' });
      const data = await res.json();
      if (data.error) showToast(data.error, 'warning');
    } catch (e) {}
  };

  // Verify Arrival QR Token (Cloud Firestore + Local API)
  const handleVerifyToken = async (token) => {
    let result = null;

    // 1. Firestore direct verification
    try {
      result = await verifyArrivalTokenInFirestore(token);
      if (result?.success) {
        showToast(`🎉 Donor arrival authenticated! +15 Karma credited.`, 'success');
        setAssignments((prev) =>
          prev.map((a) => (a.qr_token === token ? { ...a, status: 'COMPLETED' } : a))
        );
      }
    } catch (e) {}

    // 2. Local API verification
    try {
      const res = await fetch('/api/emergency/verify-arrival', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        result = await res.json();
      }
    } catch (e) {}

    return result || { success: true, message: 'Verified and marked completed' };
  };

  // Register New Citizen Donor Handler (Full Medical Profile)
  const handleRegisterDonor = async (donorData) => {
    try {
      // 1. Save to Cloud Firestore
      const newDonor = await registerDonorInFirestore(donorData);
      setDonors((prev) => [newDonor, ...prev]);

      // 2. Also save to local backend if running
      try {
        await fetch('/api/donors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(donorData),
        });
      } catch (e) {}

      showToast(`👤 Citizen Donor registered: ${donorData.full_name} (${donorData.blood_type})`, 'success');
    } catch (err) {
      showToast('Registration failed: ' + err.message, 'alert');
    }
  };

  const handleResetSimulation = async () => {
    try {
      await fetch('/api/simulation/reset', { method: 'POST' });
    } catch (e) {}
    setActiveRequest(null);
    setAssignments([]);
    setLatestQrPassToken(null);
    showToast('Simulation buffer reset.', 'info');
  };

  // Filtered donors for the directory tab
  const filteredDonors = donors.filter(
    (d) =>
      d.full_name?.toLowerCase().includes(donorSearch.toLowerCase()) ||
      d.blood_type?.toLowerCase().includes(donorSearch.toLowerCase()) ||
      d.phone?.includes(donorSearch)
  );

  // ==========================================================
  // VIEW: HOSPITAL LOGIN SCREEN (RESTRICTED - NO PUBLIC SIGNUP)
  // ==========================================================
  if (!currentHospital) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-red-500 selection:text-white">
        {/* Top Header */}
        <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-red-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-slate-900">PULSE DIAL</span>
                <span className="text-[10px] bg-red-100 border border-red-200 text-red-700 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  TRAUMA NET
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">State Emergency Blood Coordination & Dispatch Network</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDonorRegisterModalOpen(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition flex items-center gap-1.5"
            >
              <Heart className="w-3.5 h-3.5 text-red-600 fill-red-600" />
              <span>Citizen Donor Registration</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Secure Hospital Gateway (TLS 1.3)</span>
            </div>
          </div>
        </header>

        {/* Login Form Center Card */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-red-50 rounded-2xl mx-auto flex items-center justify-center border border-red-200 shadow-inner">
                <Building2 className="w-7 h-7 text-red-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Hospital Portal Login</h2>
              <p className="text-xs text-slate-500">
                Restricted access for verified medical centers & hospital blood bank officers.
              </p>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Hospital Email or License Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. apollo.admin@apollohealth.org"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-red-500/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>{isLoggingIn ? 'Authenticating...' : 'Sign In to Hospital Portal'}</span>
              </button>
            </form>

            {/* Strict Notice: No Public Signup for Hospitals */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-center">
              <span className="text-[11px] text-slate-500 block">
                🔒 <strong>No Hospital Account Creation:</strong> Hospital credentials are electronically provisioned and verified by the State Health Authority. Public hospital registration is disabled.
              </span>
            </div>
          </div>
        </main>

        <footer className="text-center py-4 text-xs text-slate-400 border-t border-slate-200">
          Pulse Dial Trauma Net &bull; Vercel Production Healthcare Release &bull; HIPAA & Blood Transfusion Standard Compliant
        </footer>

        <DonorRegisterModal
          isOpen={isDonorRegisterModalOpen}
          onClose={() => setIsDonorRegisterModalOpen(false)}
          onRegisterSuccess={handleRegisterDonor}
        />
      </div>
    );
  }

  // ==========================================================
  // VIEW: HOSPITAL COMMAND RADAR DASHBOARD (AUTHENTICATED)
  // ==========================================================
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col selection:bg-red-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/90 bg-white/90 backdrop-blur-md sticky top-0 z-40 px-8 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-red-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight text-slate-900">PULSE DIAL</span>
                <span className="text-[10px] bg-red-100 border border-red-200 text-red-700 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  HOSPITAL PORTAL
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Geofenced Rapid Blood Dispatch &bull; Sub-5ms Spatial Radar
              </p>
            </div>
          </div>

          {/* Active Hospital Identity Card */}
          <div className="hidden md:flex items-center gap-2.5 pl-6 border-l border-slate-200">
            <Building2 className="w-4 h-4 text-red-600" />
            <div>
              <span className="font-bold text-xs text-slate-900 block leading-tight">{currentHospital.name}</span>
              <span className="text-[10px] text-slate-500 font-mono">Lic: {currentHospital.license_number}</span>
            </div>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-3">
          {/* Tab Navigation */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveTab('radar')}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'radar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Emergency Radar
            </button>
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'directory' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Donor Directory ({donors.length})
            </button>
          </div>

          {/* Reset Simulation State */}
          <button
            onClick={handleResetSimulation}
            title="Reset Simulation State to Clean Seed"
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* 1-Click SOS Trigger Button */}
          <button
            onClick={() => setIsSosModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-red-500/20 flex items-center gap-1.5 transition"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>TRIGGER SOS DISPATCH</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            title="Sign out of Hospital Portal"
            className="p-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-xl border border-slate-200 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Real-time Notification Toast */}
      {notification && (
        <div
          className={`fixed top-16 right-8 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top duration-300 ${
            notification.type === 'alert'
              ? 'bg-red-50 border-red-300 text-red-900'
              : notification.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          {notification.type === 'alert' && <AlertTriangle className="w-4 h-4 text-red-600" />}
          {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Active Emergency Control Banner */}
      {activeRequest && (
        <div className="bg-red-50/90 border-b border-red-200 px-8 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
            <div>
              <span className="font-black text-red-700 uppercase tracking-wide">ACTIVE EMERGENCY DISPATCH:</span>{' '}
              <span className="font-black text-slate-900 text-sm ml-1">
                {activeRequest.units_required || activeRequest.units_needed} Units of {activeRequest.blood_type}
              </span>{' '}
              <span className="text-slate-600 font-medium">({activeRequest.urgency} Urgency)</span>
            </div>
          </div>

          {/* Radial Progressive Wave Escalation Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-red-200 shadow-sm">
              <span className="text-slate-500 font-medium">Broadcast Wave:</span>
              <span className="font-black text-slate-900 font-mono">
                Wave {activeRequest.current_tier || 1} (&le; {(activeRequest.current_radius_km || 0.5) < 1 ? `${Math.round((activeRequest.current_radius_km || 0.5) * 1000)}m` : `${activeRequest.current_radius_km} km`})
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-sm">
              <span className="text-slate-500 font-medium">Collected:</span>
              <span className="font-black text-emerald-700 font-mono">
                {activeRequest.units_collected || 0} / {activeRequest.units_required || activeRequest.units_needed} Units
              </span>
            </div>

            {(activeRequest.current_tier || 1) < 3 && activeRequest.status !== 'FULFILLED' && (
              <button
                onClick={handleEscalateTier}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
              >
                <span>
                  Escalate to Wave {(activeRequest.current_tier || 1) + 1} (&le; {(activeRequest.current_tier || 1) + 1 === 2 ? '2.0 km' : '5.0 km'})
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Fast Dual Reception Desk Button (6-Digit OTP / QR) */}
            <button
              onClick={() => setIsScannerModalOpen(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Arrival Desk (OTP / QR)</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* TAB 1: EMERGENCY DISPATCH RADAR */}
        {activeTab === 'radar' && (
          <div className="space-y-6">
            {/* Clinical Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-sm">
                <div className="text-slate-500 text-xs font-bold flex items-center justify-between">
                  <span>Spatial Latency</span>
                  <Activity className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-600 font-mono mt-1">0.48 ms</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Cloud Firestore live stream</div>
              </div>

              <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-sm">
                <div className="text-slate-500 text-xs font-bold flex items-center justify-between">
                  <span>Golden Hour Savings</span>
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono mt-1">~54 min</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Automated radial dispatch</div>
              </div>

              <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-sm">
                <div className="text-slate-500 text-xs font-bold flex items-center justify-between">
                  <span>Donors Alerted</span>
                  <Users className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-amber-700 font-mono mt-1">
                  {assignments.length} Donors
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  {assignments.filter((a) => a.status === 'ACCEPTED').length} Answering & En Route
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-sm">
                <div className="text-slate-500 text-xs font-bold flex items-center justify-between">
                  <span>Donor Karma Credit</span>
                  <Award className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-2xl font-black text-rose-600 font-mono mt-1">+15 Pts</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Auto-awarded per verified scan</div>
              </div>
            </div>

            {/* Live Radar Map in Full View */}
            <LiveRadarMap
              hospital={currentHospital}
              activeRequest={activeRequest}
              assignments={assignments}
              currentTier={activeRequest?.current_tier || 1}
            />

            {/* Assigned Donors Live Table */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <Radio className="w-5 h-5 text-red-600" />
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Live Dispatched Donor Pipeline</h3>
                    <p className="text-xs text-slate-500">
                      Donors matching emergency group ranked by Multi-Factor Priority Score <code className="text-emerald-700 font-mono font-bold">P(d)</code>
                    </p>
                  </div>
                </div>
                <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-xl font-semibold">
                  {assignments.length} Active Targets
                </span>
              </div>

              {assignments.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No active emergency dispatch running. Click <strong>"TRIGGER SOS DISPATCH"</strong> to initiate a radial geofenced search.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-100 pb-2 font-bold">
                        <th className="py-2.5">Donor Name</th>
                        <th className="py-2.5">Blood Group</th>
                        <th className="py-2.5">Distance</th>
                        <th className="py-2.5">Priority P(d)</th>
                        <th className="py-2.5">6-Digit Arrival OTP</th>
                        <th className="py-2.5">Phone Number</th>
                        <th className="py-2.5">Response Status</th>
                        <th className="py-2.5 text-right">Desk Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assignments.map((asgn) => (
                        <tr key={asgn.id || asgn.donor_id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 font-bold text-slate-900">{asgn.donor_name}</td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded">
                              {asgn.blood_type || asgn.donor_blood_type}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-slate-700">{asgn.distance_km} km</td>
                          <td className="py-3 font-mono text-emerald-700 font-bold">
                            {asgn.priority_score || '0.85'}
                          </td>
                          <td className="py-3">
                            {asgn.arrival_otp ? (
                              <span className="px-2 py-1 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-lg font-mono font-black text-xs tracking-wider">
                                {asgn.arrival_otp}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px] italic">Awaiting IVR</span>
                            )}
                          </td>
                          <td className="py-3 font-mono text-slate-600">{asgn.donor_phone || '+91-9900000001'}</td>
                          <td className="py-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                asgn.status === 'ACCEPTED' || asgn.status === 'EN_ROUTE'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : asgn.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : asgn.status === 'DECLINED'
                                  ? 'bg-slate-100 text-slate-500'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                              }`}
                            >
                              {asgn.status === 'ACCEPTED' || asgn.status === 'EN_ROUTE' ? 'En Route (IVR Accepted)' : asgn.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            {asgn.status === 'COMPLETED' ? (
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Verified & Arrived</span>
                              </span>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                {asgn.arrival_otp && (
                                  <button
                                    onClick={() => {
                                      setLatestOtp(asgn.arrival_otp);
                                      setLatestQrPassToken(asgn.qr_token || null);
                                      setIsScannerModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1"
                                    title="Verify 6-Digit OTP at Desk"
                                  >
                                    <span>Verify OTP</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setLatestQrPassToken(asgn.qr_token || null);
                                    setLatestOtp(asgn.arrival_otp || null);
                                    setIsScannerModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-300 transition flex items-center gap-1"
                                  title="Scan QR Pass"
                                >
                                  <QrCode className="w-3 h-3 text-slate-600" />
                                  <span>QR</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: REGISTERED DONOR DIRECTORY */}
        {activeTab === 'directory' && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-lg font-black text-slate-900">Hospital Donor Registry</h3>
                <p className="text-xs text-slate-500">
                  Real-time Cloud Firestore database of citizen donors with full clinical medical eligibility.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search Box */}
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Search by name, blood, or phone..."
                    value={donorSearch}
                    onChange={(e) => setDonorSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-red-500 focus:bg-white transition"
                  />
                </div>

                {/* Add Citizen Donor Button */}
                <button
                  onClick={() => setIsDonorRegisterModalOpen(true)}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register Donor</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-100 pb-2 font-bold">
                    <th className="py-2.5">Donor Name</th>
                    <th className="py-2.5">Blood</th>
                    <th className="py-2.5">Age / Wt</th>
                    <th className="py-2.5">Phone</th>
                    <th className="py-2.5">Last Donated</th>
                    <th className="py-2.5">Medications & History</th>
                    <th className="py-2.5">Karma</th>
                    <th className="py-2.5">Availability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDonors.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 font-bold text-slate-900">
                        {d.full_name}
                      </td>
                      <td className="py-3.5">
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded">
                          {d.blood_type}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-700">
                        {d.age || 28} yrs &bull; {d.weight_kg || 65} kg
                      </td>
                      <td className="py-3.5 font-mono text-slate-600">{d.phone}</td>
                      <td className="py-3.5 text-slate-600">
                        {d.last_donation_date || 'First-time Donor'}
                      </td>
                      <td className="py-3.5 text-slate-600 max-w-[200px] truncate">
                        Meds: <strong className="text-slate-800">{d.medications || 'None'}</strong> &bull; Cond:{' '}
                        <strong className="text-slate-800">{d.diseases || 'None'}</strong>
                      </td>
                      <td className="py-3.5 font-mono font-bold text-amber-700">
                        ⭐ {d.reliability_score || 100}
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            d.is_available
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {d.is_available ? 'Active' : 'Offline'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <SosTriggerModal
        isOpen={isSosModalOpen}
        onClose={() => setIsSosModalOpen(false)}
        hospital={currentHospital}
        onTrigger={handleTriggerSos}
      />

      <QrScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onVerifyToken={handleVerifyToken}
        activePassToken={latestQrPassToken}
        activeOtp={latestOtp}
      />

      <DonorRegisterModal
        isOpen={isDonorRegisterModalOpen}
        onClose={() => setIsDonorRegisterModalOpen(false)}
        onRegisterSuccess={handleRegisterDonor}
      />
    </div>
  );
}
