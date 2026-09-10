import 'package:flutter/material.dart';
import 'pre_screening_dialog.dart';

class SosInterruptionScreen extends StatelessWidget {
  final String requestId;
  final String hospitalName;
  final String bloodType;
  final double distanceKm;
  final int etaMinutes;

  const SosInterruptionScreen({
    super.key,
    required this.requestId,
    required this.hospitalName,
    required this.bloodType,
    required this.distanceKm,
    required this.etaMinutes,
  });

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async => false, // Prevent accidental back press during emergency
      child: Scaffold(
        backgroundColor: const Color(0xFF7F1D1D), // Dark Red Emergency Background
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Urgent Header Banner
                Column(
                  children: [
                    const Icon(Icons.warning_amber_rounded, size: 72, color: Colors.amberAccent),
                    const SizedBox(height: 12),
                    const Text(
                      'CRITICAL BLOOD SOS ALERT',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.2,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Matched within Geofenced Tier 1 Perimeter',
                      style: TextStyle(fontSize: 14, color: Colors.red.shade100),
                    ),
                  ],
                ),

                // Emergency Details Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.5),
                        blurRadius: 16,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Blood Group Needed:', style: TextStyle(color: Colors.white70, fontSize: 15)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.red,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              bloodType,
                              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                          ),
                        ],
                      ),
                      const Divider(color: Colors.white24, height: 24),
                      Row(
                        children: [
                          const Icon(Icons.local_hospital, color: Colors.redAccent, size: 24),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              hospitalName,
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          Column(
                            children: [
                              const Text('Driving Distance', style: TextStyle(color: Colors.white60, fontSize: 13)),
                              const SizedBox(height: 4),
                              Text(
                                '${distanceKm.toStringAsFixed(1)} km',
                                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                            ],
                          ),
                          Container(width: 1, height: 32, color: Colors.white24),
                          Column(
                            children: [
                              const Text('Est. Drive Time', style: TextStyle(color: Colors.white60, fontSize: 13)),
                              const SizedBox(height: 4),
                              Text(
                                '~ $etaMinutes mins',
                                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.greenAccent),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Action Buttons
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        elevation: 4,
                      ),
                      onPressed: () {
                        // Launch 4-Question Medical Pre-Screening
                        showModalBottomSheet(
                          context: context,
                          isScrollControlled: true,
                          backgroundColor: Colors.transparent,
                          builder: (ctx) => PreScreeningDialog(
                            requestId: requestId,
                            hospitalName: hospitalName,
                            bloodType: bloodType,
                          ),
                        );
                      },
                      child: const Text(
                        'ACCEPT DISPATCH & PRE-SCREEN',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: 0.8),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.white70,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      onPressed: () {
                        Navigator.pop(context);
                      },
                      child: const Text('Unable to Respond (Decline)'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
