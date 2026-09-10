import 'package:flutter/material.dart';
import 'sos_interruption_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool isAvailable = true;
  int karmaScore = 140;
  int remainingCooldownDays = 0; // Eligible
  String bloodType = "O-";
  String donorName = "Arjun Menon";

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Row(
          children: [
            Icon(Icons.favorite, color: Colors.redAccent),
            SizedBox(width: 8),
            Text('Pulse Dial', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.emergency_share, color: Colors.orangeAccent),
            tooltip: 'Simulate Incoming SOS Alert',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const SosInterruptionScreen(
                    requestId: 'req-sim-991',
                    hospitalName: 'Apollo Trauma Center & Regional Blood Bank',
                    bloodType: 'O-',
                    distanceKm: 0.8,
                    etaMinutes: 4,
                  ),
                ),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Donor Profile Header
            Card(
              color: const Color(0xFF1E293B),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 32,
                      backgroundColor: Colors.red.shade900,
                      child: Text(
                        bloodType,
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            donorName,
                            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.amber.shade900.withOpacity(0.4),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.parseBorder(Border.all(color: Colors.amber, width: 1)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.star, color: Colors.amber, size: 16),
                                const SizedBox(width: 4),
                                Text(
                                  'Karma Score: $karmaScore / 150',
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.amber),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Availability Switch
            Card(
              color: isAvailable ? const Color(0xFF064E3B) : const Color(0xFF451A1A),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: SwitchListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                title: Text(
                  isAvailable ? 'Status: Active for Emergency SOS' : 'Status: Offline / Standby',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                ),
                subtitle: Text(
                  isAvailable ? 'Participating in Geofenced Radial Dispatch' : 'Not receiving emergency dispatch pings',
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                ),
                value: isAvailable,
                activeColor: Colors.greenAccent,
                onChanged: (val) {
                  setState(() => isAvailable = val);
                },
              ),
            ),
            const SizedBox(height: 16),

            // 90-Day Whole Blood Cooldown Gauge
            Card(
              color: const Color(0xFF1E293B),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '90-Day Medical Cooldown',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        Icon(Icons.health_and_safety, color: Colors.emerald, size: 22),
                      ],
                    ),
                    const SizedBox(height: 16),
                    LinearProgressIndicator(
                      value: remainingCooldownDays == 0 ? 1.0 : (90 - remainingCooldownDays) / 90.0,
                      backgroundColor: Colors.slate.shade800,
                      color: remainingCooldownDays == 0 ? Colors.greenAccent : Colors.orangeAccent,
                      minHeight: 12,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      remainingCooldownDays == 0
                          ? '✅ 100% Eligible: Whole Blood Donation Ready'
                          : '⏳ In Cooldown: $remainingCooldownDays days remaining until eligible',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: remainingCooldownDays == 0 ? Colors.greenAccent : Colors.orangeAccent,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
