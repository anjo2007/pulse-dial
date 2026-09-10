import 'package:flutter/material.dart';
import 'qr_pass_screen.dart';

class PreScreeningDialog extends StatefulWidget {
  final String requestId;
  final String hospitalName;
  final String bloodType;

  const PreScreeningDialog({
    super.key,
    required this.requestId,
    required this.hospitalName,
    required this.bloodType,
  });

  @override
  State<PreScreeningDialog> createState() => _PreScreeningDialogState();
}

class _PreScreeningDialogState extends State<PreScreeningDialog> {
  bool q1FeverFree = false;
  bool q2NoAlcohol = false;
  bool q3NoAntibiotics = false;
  bool q4WeightMet = false;

  bool get allPassed => q1FeverFree && q2NoAlcohol && q3NoAntibiotics && q4WeightMet;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF1E293B),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        top: 24,
        left: 24,
        right: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Medical Pre-Screening',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              IconButton(
                icon: const Icon(Icons.close, color: Colors.white54),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Confirm the 4 mandatory safety conditions per Clinical Blood Banking guidelines:',
            style: TextStyle(fontSize: 13, color: Colors.white70),
          ),
          const SizedBox(height: 16),

          CheckboxListTile(
            title: const Text('Free of fever, cold, or infections in the last 14 days', style: TextStyle(color: Colors.white, fontSize: 14)),
            value: q1FeverFree,
            activeColor: Colors.emerald,
            onChanged: (v) => setState(() => q1FeverFree = v ?? false),
          ),
          CheckboxListTile(
            title: const Text('No alcohol consumption in the past 24 hours', style: TextStyle(color: Colors.white, fontSize: 14)),
            value: q2NoAlcohol,
            activeColor: Colors.emerald,
            onChanged: (v) => setState(() => q2NoAlcohol = v ?? false),
          ),
          CheckboxListTile(
            title: const Text('Not currently taking antibiotics or restricted medications', style: TextStyle(color: Colors.white, fontSize: 14)),
            value: q3NoAntibiotics,
            activeColor: Colors.emerald,
            onChanged: (v) => setState(() => q3NoAntibiotics = v ?? false),
          ),
          CheckboxListTile(
            title: const Text('Minimum body weight criteria met (≥ 50 kg / 110 lbs)', style: TextStyle(color: Colors.white, fontSize: 14)),
            value: q4WeightMet,
            activeColor: Colors.emerald,
            onChanged: (v) => setState(() => q4WeightMet = v ?? false),
          ),
          const SizedBox(height: 20),

          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: allPassed ? const Color(0xFF10B981) : Colors.grey.shade700,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            onPressed: allPassed
                ? () {
                    Navigator.pop(context); // Close dialog
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(
                        builder: (ctx) => QrPassScreen(
                          requestId: widget.requestId,
                          hospitalName: widget.hospitalName,
                          bloodType: widget.bloodType,
                        ),
                      ),
                    );
                  }
                : null,
            child: const Text(
              'CONFIRM & GENERATE ARRIVAL QR PASS',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}
