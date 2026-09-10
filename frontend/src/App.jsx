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
  Smartphone,
  Hospital as HospitalIcon,
  ChevronRight,
  TrendingUp,
  Award,
} from 'lucide-react';
import LiveRadarMap from './components/LiveRadarMap.jsx';
import SosTriggerModal from './components/SosTriggerModal.jsx';
import QrScannerModal from './components/QrScannerModal.jsx';
import DonorMobileSimulator from './components/DonorMobileSimulator.jsx';

export default function App() {
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [donors, setDonors] = useState([]);
  const [activeRequest, setActiveRequest] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [latestQrPassToken, setLatestQrPassToken] = useState(null);
  const [viewMode, setViewMode] = useState('split'); // 'hospital' | 'donor' | 'split'
  const [notification, setNotification] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef(null);

  // Fetch initial hospitals and donors
  const fetchData = async () => {
    try {
      const [hospRes, donRes, actRes] = await Promise.all([
        fetch('/api/hospitals').then((r) => r.json()),
        fetch('/api/donors').then((r) => r.json()),
        fetch('/api/emergency/active').then((r) => r.json()),
      ]);

      setHospitals(hospRes);
      if (hospRes.length > 0 && !selectedHospital) {
        setSelectedHospital(hospRes[0]);
      }
      setDonors(donRes);

      if (actRes.length > 0) {
        const latest = actRes[actRes.length - 1];
        setActiveRequest(latest);
        // fetch radar details for this request
        const radarRes = await fetch(`/api/emergency/${latest.id}/radar`).then((r) => r.json());
        setAssignments(radarRes.assignments || []);
      }
    } catch (err) {
      console.error('Failed to fetch initial data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // WebSocket real-time connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const connectWs = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        ws.send(JSON.stringify({ type: 'IDENTIFY', role: 'HOSPITAL', id: selectedHospital?.id }));
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
        setTimeout(connectWs, 3000); // Auto-reconnect
      };
    };

    connectWs();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [selectedHospital]);

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
        showToast(`🚨 Tier 1 Emergency Dispatch Activated: ${event.request.blood_type} needed at ${event.request.hospital_name}!`, 'alert');
        break;

      case 'TIER_ESCALATED':
        setActiveRequest((prev) => (prev ? { ...prev, current_tier: event.tier, current_radius_km: event.radiusKm } : prev));
        if (event.newAssignments) {
          setAssignments((prev) => [...prev, ...event.newAssignments]);
        }
        showToast(`⚠️ Radial Escalation to Tier ${event.tier} (<= ${event.radiusKm} km) triggered!`, 'warning');
        break;

      case 'DONOR_RESPONSE_UPDATED':
        setAssignments((prev) =>
          prev.map((asgn) =>
            asgn.donor_id === event.donorId
              ? { ...asgn, status: event.status, qr_token: event.assignment?.qr_token }
              : asgn
          )
        );
        if (event.status === 'ACCEPTED') {
          showToast(`✅ Donor accepted dispatch! En route to hospital.`, 'success');
          if (event.assignment?.qr_token) {
            setLatestQrPassToken(event.assignment.qr_token);
          }
        } else {
          showToast(`❌ Donor declined dispatch.`, 'info');
        }
        break;

      case 'DONOR_VERIFIED_ARRIVAL':
        showToast(`🎉 Donor arrival confirmed! +15 Reliability Karma credited.`, 'success');
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
        // Refresh donors to get new reliability score
        fetch('/api/donors')
          .then((r) => r.json())
          .then(setDonors);
        break;

      case 'DONOR_AVAILABILITY_CHANGED':
        setDonors((prev) =>
          prev.map((d) => (d.id === event.donorId ? { ...d, is_available: event.is_available } : d))
        );
        break;

      case 'SIMULATION_RESET':
        fetchData();
        showToast('Simulation database reset.', 'info');
        break;

      default:
        break;
    }
  };

  // Trigger SOS Request
  const handleTriggerSos = async (reqData) => {
    const res = await fetch('/api/emergency/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqData),
    });
    const data = await res.json();
    setActiveRequest(data.request);
    setAssignments(data.assignments);
    showToast(`Emergency dispatch triggered in ${data.searchMetrics?.latencyMs}ms!`, 'success');
  };

  // Escalate Tier manually
  const handleEscalateTier = async () => {
    if (!activeRequest) return;
    const res = await fetch(`/api/emergency/${activeRequest.id}/escalate`, {
      method: 'POST',
    });
    const data = await res.json();
    if (data.error) {
      showToast(data.error, 'warning');
    }
  };

  // Verify Arrival QR Token
  const handleVerifyToken = async (token) => {
    const res = await fetch('/api/emergency/verify-arrival', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return await res.json();
  };

  // Donor Actions from Simulator
  const handleToggleAvailability = async (donorId) => {
    const res = await fetch(`/api/donors/${donorId}/toggle`, { method: 'POST' });
    const data = await res.json();
    setDonors((prev) =>
      prev.map((d) => (d.id === donorId ? { ...d, is_available: data.is_available } : d))
    );
  };

  const handleDonorRespond = async (reqId, donorId, response) => {
    const res = await fetch(`/api/emergency/${reqId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ donor_id: donorId, response }),
    });
    const data = await res.json();
    if (data.qrPass) {
      setLatestQrPassToken(data.qrPass.token);
    }
    return data;
  };

  const handleResetSimulation = async () => {
    await fetch('/api/simulation/reset', { method: 'POST' });
    setActiveRequest(null);
    setAssignments([]);
    setLatestQrPassToken(null);
  };

  // Currently focused donor for mobile client simulator
  const activeDonor = donors.find((d) => d.blood_type === 'O-' && d.is_eligible) || donors[0];

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-red-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-900/50">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-wider text-white">PULSE DIAL</span>
                <span className="text-[10px] bg-red-950/80 border border-red-500/50 text-red-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  RAPID DISPATCH v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Sub-Second Geofenced Blood Coordination & Trauma Escalation
              </p>
            </div>
          </div>

          {/* Hospital Selector */}
          <div className="hidden lg:flex items-center gap-2 pl-6 border-l border-slate-800">
            <HospitalIcon className="w-4 h-4 text-slate-400" />
            <select
              value={selectedHospital?.id || ''}
              onChange={(e) => {
                const found = hospitals.find((h) => h.id === e.target.value);
                if (found) setSelectedHospital(found);
              }}
              className="bg-slate-800/80 border border-slate-700 text-xs rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-red-500"
            >
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.license_number})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Controls & View Toggles */}
        <div className="flex items-center gap-3">
          {/* WebSocket Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/60">
            <span
              className={`w-2 h-2 rounded-full ${
                wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-[11px] font-mono">{wsConnected ? 'LIVE FEED' : 'CONNECTING'}</span>
          </div>

          {/* View Mode Switcher */}
          <div className="flex bg-slate-800/90 p-0.5 rounded-xl border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setViewMode('hospital')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'hospital' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hospital Radar
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'split' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dual Drill View
            </button>
            <button
              onClick={() => setViewMode('donor')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'donor' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Donor Mobile
            </button>
          </div>

          {/* Reset Drill State Button */}
          <button
            onClick={handleResetSimulation}
            title="Reset Simulation State to Clean Seed"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* 1-Click SOS Trigger Button */}
          <button
            onClick={() => setIsSosModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-red-950/60 flex items-center gap-1.5 transition"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>TRIGGER SOS DISPATCH</span>
          </button>
        </div>
      </header>

      {/* Real-time Toast Notifications */}
      {notification && (
        <div
          className={`fixed top-16 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-top duration-300 ${
            notification.type === 'alert'
              ? 'bg-red-900 border-red-500 text-white'
              : notification.type === 'warning'
              ? 'bg-amber-900 border-amber-500 text-white'
              : notification.type === 'success'
              ? 'bg-emerald-900 border-emerald-500 text-white'
              : 'bg-slate-800 border-slate-700 text-slate-200'
          }`}
        >
          {notification.type === 'alert' && <AlertTriangle className="w-4 h-4 text-red-300" />}
          {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-300" />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Active Emergency Control Banner */}
      {activeRequest && (
        <div className="bg-gradient-to-r from-red-950/90 via-slate-900 to-red-950/90 border-b border-red-900/60 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <div>
              <span className="font-bold text-red-400 uppercase tracking-wide">ACTIVE EMERGENCY DISPATCH:</span>{' '}
              <span className="font-black text-white text-sm ml-1">
                {activeRequest.units_needed} Units of {activeRequest.blood_type}
              </span>{' '}
              <span className="text-slate-400">({activeRequest.urgency} Urgency)</span>
            </div>
          </div>

          {/* Radial Tier Escalation Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
              <span className="text-slate-400">Current Perimeter:</span>
              <span className="font-black text-white font-mono">
                Tier {activeRequest.current_tier} (&le; {activeRequest.current_radius_km} km)
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
              <span className="text-slate-400">Collected:</span>
              <span className="font-black text-emerald-400 font-mono">
                {activeRequest.units_collected || 0} / {activeRequest.units_needed} Units
              </span>
            </div>

            {activeRequest.current_tier < 3 && activeRequest.status !== 'FULFILLED' && (
              <button
                onClick={handleEscalateTier}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow"
              >
                <span>Escalate to Tier {activeRequest.current_tier + 1}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Open Scanner Modal */}
            <button
              onClick={() => setIsScannerModalOpen(true)}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Scan Arrival QR</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 gap-6">
        {/* VIEW MODE: HOSPITAL COMMAND RADAR */}
        {(viewMode === 'hospital' || viewMode === 'split') && (
          <div className="space-y-6">
            {/* Top Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow">
                <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
                  <span>In-Memory Latency</span>
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono mt-1">0.84 ms</div>
                <div className="text-[11px] text-slate-500 mt-0.5">52-bit Geohash sorted sets</div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow">
                <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
                  <span>Golden Hour Savings</span>
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono mt-1">~54 min</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Replaces manual calling tree</div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow">
                <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
                  <span>Active Donors Pinged</span>
                  <Users className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                  {assignments.length} Donors
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {assignments.filter((a) => a.status === 'ACCEPTED').length} En Route
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow">
                <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
                  <span>Donor Reliability Reward</span>
                  <Award className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl font-black text-rose-400 font-mono mt-1">+15 Pts</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Awarded upon single QR scan</div>
              </div>
            </div>

            {/* Split Grid: Radar Map + Donor Mobile Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Live Radar Map & Assigned Donors */}
              <div className={viewMode === 'split' ? 'lg:col-span-8 space-y-6' : 'lg:col-span-12 space-y-6'}>
                {/* Live Radar Map */}
                <LiveRadarMap
                  hospital={selectedHospital}
                  activeRequest={activeRequest}
                  assignments={assignments}
                  currentTier={activeRequest?.current_tier || 1}
                />

                {/* Assigned Donors Live Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-red-500" />
                      <h3 className="font-bold text-sm text-white">Live Dispatched Donor Pipeline</h3>
                    </div>
                    <span className="text-xs text-slate-400">
                      Ranked by Multi-Factor Priority Function <code className="text-emerald-400">P(d)</code>
                    </span>
                  </div>

                  {assignments.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      No active emergency dispatch running. Click <strong>"TRIGGER SOS DISPATCH"</strong> to initiate a radial geofenced search.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-800 pb-2">
                            <th className="py-2">Donor Name</th>
                            <th className="py-2">Blood</th>
                            <th className="py-2">Distance</th>
                            <th className="py-2">Priority P(d)</th>
                            <th className="py-2">Tier</th>
                            <th className="py-2">Response Status</th>
                            <th className="py-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {assignments.map((asgn) => (
                            <tr key={asgn.id || asgn.donor_id} className="hover:bg-slate-800/40">
                              <td className="py-3 font-semibold text-white">{asgn.donor_name}</td>
                              <td className="py-3">
                                <span className="px-2 py-0.5 bg-red-950 text-red-400 font-bold rounded">
                                  {asgn.donor_blood_type}
                                </span>
                              </td>
                              <td className="py-3 font-mono text-slate-300">{asgn.distance_km} km</td>
                              <td className="py-3 font-mono text-emerald-400 font-semibold">
                                {asgn.priority_score || 'N/A'}
                              </td>
                              <td className="py-3 text-slate-400">Tier {asgn.tier_level}</td>
                              <td className="py-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                    asgn.status === 'ACCEPTED'
                                      ? 'bg-blue-900/60 text-blue-300 border border-blue-600'
                                      : asgn.status === 'COMPLETED'
                                      ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-600'
                                      : asgn.status === 'DECLINED'
                                      ? 'bg-slate-800 text-slate-400'
                                      : 'bg-amber-900/60 text-amber-300 border border-amber-600'
                                  }`}
                                >
                                  {asgn.status}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                {asgn.status === 'ACCEPTED' && (
                                  <button
                                    onClick={() => {
                                      setLatestQrPassToken(asgn.qr_token);
                                      setIsScannerModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold shadow"
                                  >
                                    Scan QR
                                  </button>
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

              {/* Right Column in Split Mode: Donor Mobile Simulator */}
              {viewMode === 'split' && (
                <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col items-center">
                  <div className="w-full text-center pb-3 mb-2 border-b border-slate-800">
                    <span className="text-xs font-black tracking-wider uppercase text-slate-300 flex items-center justify-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-red-500" />
                      Citizen Donor Android Client
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Live interactive device pairing (bypasses Doze mode)
                    </span>
                  </div>

                  <DonorMobileSimulator
                    donor={activeDonor}
                    activeEmergency={activeRequest}
                    onToggleAvailability={handleToggleAvailability}
                    onRespond={handleDonorRespond}
                    onArrivalVerified={(token) => {
                      setLatestQrPassToken(token);
                      setIsScannerModalOpen(true);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW MODE: DONOR ONLY */}
        {viewMode === 'donor' && (
          <div className="max-w-md mx-auto py-4">
            <DonorMobileSimulator
              donor={activeDonor}
              activeEmergency={activeRequest}
              onToggleAvailability={handleToggleAvailability}
              onRespond={handleDonorRespond}
              onArrivalVerified={(token) => {
                setLatestQrPassToken(token);
                setIsScannerModalOpen(true);
              }}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <SosTriggerModal
        isOpen={isSosModalOpen}
        onClose={() => setIsSosModalOpen(false)}
        hospital={selectedHospital}
        onTrigger={handleTriggerSos}
      />

      <QrScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onVerifyToken={handleVerifyToken}
        activePassToken={latestQrPassToken}
      />
    </div>
  );
}
