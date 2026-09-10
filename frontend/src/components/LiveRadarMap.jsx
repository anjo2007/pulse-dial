import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Helper to re-center map when hospital or target changes
function RecenterMap({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || 13);
    }
  }, [center, zoom, map]);
  return null;
}

// Custom Leaflet DivIcons for Medical Radar
const createHospitalIcon = () =>
  L.divIcon({
    className: 'custom-hospital-icon',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-10 h-10 bg-red-500 rounded-full animate-ping opacity-40"></div>
        <div class="w-8 h-8 bg-red-600 border-2 border-white rounded-full flex items-center justify-center shadow-lg text-white font-bold text-xs">
          🏥
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const createDonorIcon = (status, bloodType) => {
  let bgColor = 'bg-amber-500';
  let badgeText = 'PING';

  if (status === 'ACCEPTED') {
    bgColor = 'bg-blue-500 animate-pulse';
    badgeText = 'ROUTE';
  } else if (status === 'COMPLETED' || status === 'ARRIVED') {
    bgColor = 'bg-emerald-500';
    badgeText = 'ARRIVED';
  } else if (status === 'DECLINED') {
    bgColor = 'bg-slate-500';
    badgeText = 'NO';
  }

  return L.divIcon({
    className: 'custom-donor-icon',
    html: `
      <div class="relative flex flex-col items-center">
        <div class="px-1.5 py-0.5 ${bgColor} border border-white text-white font-black text-[10px] rounded-full shadow-md flex items-center gap-0.5">
          <span>🩸</span><span>${bloodType}</span>
        </div>
        <div class="w-2 h-2 ${bgColor} rotate-45 -mt-1 shadow"></div>
      </div>
    `,
    iconSize: [40, 24],
    iconAnchor: [20, 24],
  });
};

export default function LiveRadarMap({ hospital, activeRequest, assignments = [], currentTier = 1 }) {
  const hospitalPos = hospital ? [hospital.lat, hospital.lon] : [10.5276, 76.2144];

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      {/* Radar Overlay Controls / Legend */}
      <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-700 text-xs text-slate-200 shadow-lg space-y-1.5 pointer-events-none">
        <div className="flex items-center gap-2 font-semibold text-slate-100">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>SPATIAL RADAR ACTIVE (Sub-5ms Geohash)</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-red-500 bg-red-500/20"></span>
            <span>Tier 1 (1 km)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-amber-500 bg-amber-500/20"></span>
            <span>Tier 2 (5 km)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-blue-500 bg-blue-500/20"></span>
            <span>Tier 3 (15 km)</span>
          </div>
        </div>
      </div>

      <MapContainer
        center={hospitalPos}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <RecenterMap center={hospitalPos} zoom={currentTier === 1 ? 14 : currentTier === 2 ? 12 : 11} />

        {/* CartoDB Dark Matter Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Tier 1 Radial Boundary: 1,000 meters */}
        <Circle
          center={hospitalPos}
          radius={1000}
          pathOptions={{
            color: '#EF4444',
            fillColor: '#EF4444',
            fillOpacity: currentTier >= 1 ? 0.12 : 0.04,
            weight: currentTier === 1 ? 2.5 : 1.5,
            dashArray: currentTier === 1 ? null : '4 4',
          }}
          className={currentTier === 1 ? 'radar-ring' : ''}
        />

        {/* Tier 2 Radial Boundary: 5,000 meters */}
        <Circle
          center={hospitalPos}
          radius={5000}
          pathOptions={{
            color: '#F59E0B',
            fillColor: '#F59E0B',
            fillOpacity: currentTier >= 2 ? 0.08 : 0.02,
            weight: currentTier === 2 ? 2.5 : 1,
            dashArray: currentTier === 2 ? null : '6 6',
          }}
          className={currentTier === 2 ? 'radar-ring' : ''}
        />

        {/* Tier 3 Radial Boundary: 15,000 meters */}
        <Circle
          center={hospitalPos}
          radius={15000}
          pathOptions={{
            color: '#3B82F6',
            fillColor: '#3B82F6',
            fillOpacity: currentTier >= 3 ? 0.05 : 0.01,
            weight: currentTier === 3 ? 2 : 1,
            dashArray: '8 8',
          }}
        />

        {/* Hospital Center Marker */}
        {hospital && (
          <Marker position={hospitalPos} icon={createHospitalIcon()}>
            <Popup className="dark-popup">
              <div className="space-y-1">
                <div className="font-bold text-sm text-red-400">🏥 {hospital.name}</div>
                <div className="text-xs text-slate-300">Licence: {hospital.license_number}</div>
                <div className="text-xs text-slate-400">Coords: {hospital.lat.toFixed(4)}, {hospital.lon.toFixed(4)}</div>
                {activeRequest && (
                  <div className="mt-2 pt-2 border-t border-slate-700 text-xs">
                    <span className="font-semibold text-amber-400">ACTIVE SOS: </span>
                    <span className="text-white font-bold">{activeRequest.units_needed} Units of {activeRequest.blood_type}</span>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Donors Markers */}
        {assignments.map((asgn) => {
          if (!asgn.lat || !asgn.lon) return null;
          return (
            <Marker
              key={asgn.id || asgn.donor_id}
              position={[asgn.lat, asgn.lon]}
              icon={createDonorIcon(asgn.status, asgn.donor_blood_type)}
            >
              <Popup className="dark-popup">
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-white text-sm flex items-center justify-between">
                    <span>{asgn.donor_name}</span>
                    <span className="px-1.5 py-0.5 bg-red-950 text-red-400 rounded text-[11px] font-mono">
                      {asgn.donor_blood_type}
                    </span>
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-400">Distance:</span> <strong className="text-white">{asgn.distance_km} km</strong>
                  </div>
                  {asgn.priority_score && (
                    <div className="text-slate-300">
                      <span className="text-slate-400">Composite Score P(d):</span>{' '}
                      <strong className="text-emerald-400 font-mono">{asgn.priority_score}</strong>
                    </div>
                  )}
                  <div className="text-slate-300 flex items-center gap-1.5 pt-1">
                    <span className="text-slate-400">Status:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      asgn.status === 'ACCEPTED' ? 'bg-blue-900/60 text-blue-300 border border-blue-600' :
                      asgn.status === 'COMPLETED' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-600' :
                      'bg-amber-900/60 text-amber-300 border border-amber-600'
                    }`}>
                      {asgn.status}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
