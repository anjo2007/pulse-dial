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

// Custom Leaflet DivIcons for Light Ambient Medical Radar
const createHospitalIcon = () =>
  L.divIcon({
    className: 'custom-hospital-icon',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-12 h-12 bg-red-500 rounded-full animate-ping opacity-30"></div>
        <div class="w-9 h-9 bg-red-600 border-2 border-white rounded-full flex items-center justify-center shadow-lg text-white font-bold text-sm ring-2 ring-red-300">
          🏥
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

const createDonorIcon = (status, bloodType) => {
  let bgColor = 'bg-amber-500 text-white';
  let borderColor = 'border-white';

  if (status === 'ACCEPTED') {
    bgColor = 'bg-blue-600 text-white animate-pulse';
  } else if (status === 'COMPLETED' || status === 'ARRIVED') {
    bgColor = 'bg-emerald-600 text-white';
  } else if (status === 'DECLINED') {
    bgColor = 'bg-slate-400 text-white';
  }

  return L.divIcon({
    className: 'custom-donor-icon',
    html: `
      <div class="relative flex flex-col items-center">
        <div class="px-2 py-1 ${bgColor} border-2 ${borderColor} font-black text-[11px] rounded-full shadow-lg flex items-center gap-1">
          <span>🩸</span><span>${bloodType}</span>
        </div>
        <div class="w-2.5 h-2.5 ${bgColor.split(' ')[0]} rotate-45 -mt-1 shadow-sm"></div>
      </div>
    `,
    iconSize: [44, 26],
    iconAnchor: [22, 26],
  });
};

export default function LiveRadarMap({ hospital, activeRequest, assignments = [], currentTier = 1 }) {
  const hospitalPos = hospital ? [hospital.lat, hospital.lon] : [10.5276, 76.2144];

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-200/90 shadow-xl bg-slate-50">
      {/* Radar Overlay Controls / Legend */}
      <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-800 shadow-md space-y-1.5 pointer-events-none">
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>HOSPITAL DISPATCH RADAR ACTIVE</span>
          <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">
            Sub-5ms Geohash
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-red-500 bg-red-500/30"></span>
            <span className="font-medium text-slate-700">Wave 1 (&le; 500m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-amber-500 bg-amber-500/30"></span>
            <span className="font-medium text-slate-700">Wave 2 (&le; 2.0 km)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-blue-500 bg-blue-500/30"></span>
            <span className="font-medium text-slate-700">Wave 3 (&le; 5.0 km)</span>
          </div>
        </div>
      </div>

      <MapContainer
        center={hospitalPos}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <RecenterMap center={hospitalPos} zoom={currentTier === 1 ? 15 : currentTier === 2 ? 13 : 11} />

        {/* CartoDB Positron Light Ambient Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Wave 1 Progressive Perimeter: 500 meters */}
        <Circle
          center={hospitalPos}
          radius={500}
          pathOptions={{
            color: '#DC2626',
            fillColor: '#EF4444',
            fillOpacity: currentTier >= 1 ? 0.20 : 0.05,
            weight: currentTier === 1 ? 3 : 1.5,
            dashArray: currentTier === 1 ? null : '4 4',
          }}
          className={currentTier === 1 ? 'radar-ring' : ''}
        />

        {/* Wave 2 Progressive Perimeter: 2,000 meters */}
        <Circle
          center={hospitalPos}
          radius={2000}
          pathOptions={{
            color: '#D97706',
            fillColor: '#F59E0B',
            fillOpacity: currentTier >= 2 ? 0.12 : 0.03,
            weight: currentTier === 2 ? 2.5 : 1,
            dashArray: currentTier === 2 ? null : '6 6',
          }}
          className={currentTier === 2 ? 'radar-ring' : ''}
        />

        {/* Wave 3 Progressive Perimeter: 5,000 meters */}
        <Circle
          center={hospitalPos}
          radius={5000}
          pathOptions={{
            color: '#2563EB',
            fillColor: '#3B82F6',
            fillOpacity: currentTier >= 3 ? 0.08 : 0.02,
            weight: currentTier === 3 ? 2 : 1,
            dashArray: '8 8',
          }}
        />

        {/* Hospital Center Marker */}
        {hospital && (
          <Marker position={hospitalPos} icon={createHospitalIcon()}>
            <Popup className="light-popup">
              <div className="space-y-1.5 p-0.5">
                <div className="font-bold text-sm text-red-600 flex items-center gap-1.5">
                  <span>🏥</span>
                  <span>{hospital.name}</span>
                </div>
                <div className="text-xs text-slate-600">License: <span className="font-mono font-medium text-slate-800">{hospital.license_number}</span></div>
                <div className="text-xs text-slate-500">GPS: {hospital.lat.toFixed(4)}, {hospital.lon.toFixed(4)}</div>
                {activeRequest && (
                  <div className="mt-2 pt-2 border-t border-slate-100 text-xs">
                    <span className="font-bold text-red-600 uppercase text-[10px]">Active Emergency: </span>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {activeRequest.units_needed || activeRequest.units_required} Units of {activeRequest.blood_type}
                    </div>
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
              icon={createDonorIcon(asgn.status, asgn.donor_blood_type || asgn.blood_type)}
            >
              <Popup className="light-popup">
                <div className="space-y-1.5 text-xs p-0.5">
                  <div className="font-bold text-slate-900 text-sm flex items-center justify-between border-b border-slate-100 pb-1">
                    <span>{asgn.donor_name}</span>
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-mono font-bold text-xs">
                      {asgn.donor_blood_type || asgn.blood_type}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    Distance: <strong className="text-slate-900">{asgn.distance_km} km</strong>
                  </div>
                  {asgn.priority_score && (
                    <div className="text-slate-600">
                      Composite Score P(d):{' '}
                      <strong className="text-emerald-700 font-mono bg-emerald-50 px-1 rounded border border-emerald-200">
                        {asgn.priority_score}
                      </strong>
                    </div>
                  )}
                  {asgn.arrival_otp && (
                    <div className="text-slate-600">
                      Arrival OTP:{' '}
                      <strong className="text-slate-900 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {asgn.arrival_otp}
                      </strong>
                    </div>
                  )}
                  <div className="text-slate-600 flex items-center gap-1.5 pt-1">
                    <span>Response:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      asgn.status === 'ACCEPTED' || asgn.status === 'EN_ROUTE' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      asgn.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                      'bg-amber-100 text-amber-800 border border-amber-200'
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
