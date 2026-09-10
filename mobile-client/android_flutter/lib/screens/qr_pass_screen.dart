import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

class QrPassScreen extends StatelessWidget {
  final String requestId;
  final String hospitalName;
  final String bloodType;

  const QrPassScreen({
    super.key,
    required this.requestId,
    required this.hospitalName,
    required this.bloodType,
  });

  @override
  Widget build(BuildContext context) {
    final simulatedToken = "eyJkYXRhIjp7InJlcXVlc3RJZCI6IiSRhbGciOiJIUzI1NiJ9...";

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('En Route Arrival Pass'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF064E3B),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Row(
                children: [
                  Icon(Icons.directions_car, color: Colors.greenAccent, size: 28),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Status: EN ROUTE', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.greenAccent)),
                        Text('Hospital emergency staff notified of your dispatch', style: TextStyle(color: Colors.white70, fontSize: 12)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // High Contrast QR Card
            Card(
              color: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  children: [
                    const Text(
                      'PULSE DIAL VERIFIED PASS',
                      style: TextStyle(color: Colors.black87, fontWeight: FontWeight.w900, letterSpacing: 1.0, fontSize: 16),
                    ),
                    const SizedBox(height: 4),
                    Text('Present this code to Blood Bank Staff', style: TextStyle(color: Colors.grey.shade700, fontSize: 12)),
                    const SizedBox(height: 16),
                    SizedBox(
                      height: 220,
                      width: 220,
                      child: QrImageView(
                        data: simulatedToken,
                        version: QrVersions.auto,
                        size: 220.0,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        'Target Unit: $bloodType | $hospitalName',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.red, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              onPressed: () {
                // Open external map intent (Google Maps / Waze)
              },
              icon: const Icon(Icons.navigation),
              label: const Text('OPEN NAVIGATION IN GOOGLE MAPS'),
            ),
          ],
        ),
      ),
    );
  }
}
