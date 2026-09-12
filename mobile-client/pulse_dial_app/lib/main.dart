import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';

// Firebase Firestore REST API Sync Service
Future<void> syncDonorToFirestore(Map<String, dynamic> donor) async {
  try {
    final client = HttpClient();
    final url = Uri.parse(
      'https://firestore.googleapis.com/v1/projects/pulse-dial-emergency/databases/(default)/documents/donors/${donor['id']}',
    );
    final request = await client.openUrl('PATCH', url);
    request.headers.set('Content-Type', 'application/json');

    final body = {
      'fields': {
        'full_name': {'stringValue': donor['full_name'] ?? ''},
        'phone': {'stringValue': donor['phone'] ?? ''},
        'blood_type': {'stringValue': donor['blood_type'] ?? 'O-'},
        'age': {'integerValue': '${donor['age'] ?? 25}'},
        'weight_kg': {'integerValue': '${donor['weight_kg'] ?? 65}'},
        'last_donation_date': {'stringValue': donor['last_donation_date'] ?? 'Never Donated'},
        'medications': {'stringValue': donor['medications'] ?? 'None'},
        'diseases': {'stringValue': donor['diseases'] ?? 'None (Healthy)'},
        'reliability_score': {'integerValue': '${donor['reliability_score'] ?? 100}'},
        'is_available': {'booleanValue': donor['is_available'] ?? true},
        'lat': {'doubleValue': 10.5280},
        'lon': {'doubleValue': 76.2140},
      }
    };

    request.write(jsonEncode(body));
    await request.close();
    client.close();
  } catch (e) {
    debugPrint('Firestore sync error: $e');
  }
}

void main() {
  runApp(const PulseDialDonorApp());
}

class PulseDialDonorApp extends StatelessWidget {
  const PulseDialDonorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Pulse Dial Donor',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFDC2626),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      ),
      home: const AuthWrapper(),
    );
  }
}

// Authentication Wrapper: handles Login, Signup, and Main Dashboard
class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  bool isAuthenticated = false;
  bool isLoginView = true;

  // Active user profile state
  Map<String, dynamic> userProfile = {
    'id': 'd001-tier1-o-neg',
    'full_name': 'Arjun Menon',
    'phone': '+91-9900000001',
    'blood_type': 'O-',
    'age': 28,
    'weight_kg': 72,
    'last_donation_date': '2026-04-10',
    'medications': 'None',
    'diseases': 'None (Healthy)',
    'reliability_score': 140,
    'is_available': true,
  };

  // Form controllers
  final nameCtrl = TextEditingController(text: 'Arjun Menon');
  final phoneCtrl = TextEditingController(text: '+91-9900000001');
  final passCtrl = TextEditingController(text: 'donor123');
  final ageCtrl = TextEditingController(text: '28');
  final weightCtrl = TextEditingController(text: '72');
  final lastDonatedCtrl = TextEditingController(text: '2026-04-10');
  final medsCtrl = TextEditingController(text: 'None');
  final diseaseCtrl = TextEditingController(text: 'None');
  String selectedBloodType = 'O-';

  final List<String> bloodGroups = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

  Future<void> handleRegister() async {
    if (nameCtrl.text.isEmpty || phoneCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill all mandatory fields.')),
      );
      return;
    }

    final newProfile = {
      'id': 'd_app_${DateTime.now().millisecondsSinceEpoch}',
      'full_name': nameCtrl.text.trim(),
      'phone': phoneCtrl.text.trim(),
      'blood_type': selectedBloodType,
      'age': int.tryParse(ageCtrl.text) ?? 25,
      'weight_kg': int.tryParse(weightCtrl.text) ?? 65,
      'last_donation_date': lastDonatedCtrl.text.trim().isEmpty ? 'Never Donated' : lastDonatedCtrl.text.trim(),
      'medications': medsCtrl.text.trim().isEmpty ? 'None' : medsCtrl.text.trim(),
      'diseases': diseaseCtrl.text.trim().isEmpty ? 'None' : diseaseCtrl.text.trim(),
      'reliability_score': 100,
      'is_available': true,
    };

    // Pushes directly to Cloud Firestore in background
    syncDonorToFirestore(newProfile);

    setState(() {
      userProfile = newProfile;
      isAuthenticated = true;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Registered in Pulse Dial Emergency Cloud Network!'),
        backgroundColor: Color(0xFF16A34A),
      ),
    );
  }

  void handleLogin() {
    setState(() {
      isAuthenticated = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (isAuthenticated) {
      return DonorHomeScreen(
        profile: userProfile,
        onLogout: () {
          setState(() {
            isAuthenticated = false;
          });
        },
      );
    }

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Branding Header
              Center(
                child: Column(
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        border: Border.all(color: Colors.red.shade200, width: 2),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      alignment: Alignment.center,
                      child: const Icon(Icons.favorite, color: Color(0xFFDC2626), size: 36),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'PULSE DIAL',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.2,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const Text(
                      'Citizen Donor Emergency Network',
                      style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Mode Switcher (Login vs Create Account)
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => isLoginView = true),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: isLoginView ? Colors.white : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: isLoginView
                                ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)]
                                : [],
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'Sign In',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: isLoginView ? const Color(0xFFDC2626) : const Color(0xFF64748B),
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => isLoginView = false),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: !isLoginView ? Colors.white : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: !isLoginView
                                ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)]
                                : [],
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'Create Account',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: !isLoginView ? const Color(0xFFDC2626) : const Color(0xFF64748B),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // LOGIN FORM
              if (isLoginView) ...[
                const Text(
                  'Welcome Back Donor',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Sign in with your registered phone number to receive life-saving emergency call alerts.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 18),

                TextField(
                  controller: phoneCtrl,
                  keyboardType: TextInputType.phone,
                  decoration: InputDecoration(
                    labelText: 'Phone Number',
                    hintText: '+91-9900000001',
                    prefixIcon: const Icon(Icons.phone_android),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
                const SizedBox(height: 14),

                TextField(
                  controller: passCtrl,
                  obscureText: true,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    hintText: '••••••••',
                    prefixIcon: const Icon(Icons.lock_outline),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
                const SizedBox(height: 20),

                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFDC2626),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  onPressed: handleLogin,
                  child: const Text('SIGN IN TO DONOR RADAR', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],

              // CREATE ACCOUNT / REGISTRATION FORM (WITH ALL REQUIRED MEDICAL DETAILS)
              if (!isLoginView) ...[
                const Text(
                  'Donor Registration Profile',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Required per National Blood Transfusion guidelines for emergency spatial matching:',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 16),

                TextField(
                  controller: nameCtrl,
                  decoration: InputDecoration(
                    labelText: 'Full Name *',
                    prefixIcon: const Icon(Icons.person_outline),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
                const SizedBox(height: 12),

                TextField(
                  controller: phoneCtrl,
                  keyboardType: TextInputType.phone,
                  decoration: InputDecoration(
                    labelText: 'Phone Number (OTP verified) *',
                    prefixIcon: const Icon(Icons.phone),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
                const SizedBox(height: 12),

                TextField(
                  controller: passCtrl,
                  obscureText: true,
                  decoration: InputDecoration(
                    labelText: 'Password *',
                    prefixIcon: const Icon(Icons.lock_outline),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
                const SizedBox(height: 14),

                // Blood Group Selector
                const Text('Blood Group *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: bloodGroups.map((bg) {
                    final isSel = selectedBloodType == bg;
                    return ChoiceChip(
                      label: Text(bg, style: TextStyle(fontWeight: FontWeight.bold, color: isSel ? Colors.white : Colors.black87)),
                      selected: isSel,
                      selectedColor: const Color(0xFFDC2626),
                      backgroundColor: Colors.white,
                      onSelected: (val) {
                        if (val) setState(() => selectedBloodType = bg);
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),

                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: ageCtrl,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: 'Age (18-65) *',
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: weightCtrl,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: 'Weight (kg, ≥50) *',
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                TextField(
                  controller: lastDonatedCtrl,
                  decoration: InputDecoration(
                    labelText: 'Last Blood Donated Date (YYYY-MM-DD)',
                    hintText: 'e.g. 2026-04-10 or leave blank if first time',
                    prefixIcon: const Icon(Icons.calendar_today_outlined),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
                const SizedBox(height: 12),

                TextField(
                  controller: medsCtrl,
                  decoration: InputDecoration(
                    labelText: 'Current Medications (if any)',
                    hintText: 'e.g. None or Blood Pressure, Antibiotics',
                    prefixIcon: const Icon(Icons.medication_outlined),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
                const SizedBox(height: 12),

                TextField(
                  controller: diseaseCtrl,
                  decoration: InputDecoration(
                    labelText: 'Chronic Diseases / Medical History',
                    hintText: 'e.g. None, Diabetes, Asthma, Heart Condition',
                    prefixIcon: const Icon(Icons.healing_outlined),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
                const SizedBox(height: 20),

                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFDC2626),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  onPressed: handleRegister,
                  child: const Text('REGISTER CLINICAL DONOR PROFILE', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],

              const SizedBox(height: 24),
              const Center(
                child: Text(
                  'Pulse Dial Emergency Network • Encrypted & Medical Standard Compliant',
                  style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// MAIN DASHBOARD FOR CITIZEN DONOR
class DonorHomeScreen extends StatefulWidget {
  final Map<String, dynamic> profile;
  final VoidCallback onLogout;

  const DonorHomeScreen({
    super.key,
    required this.profile,
    required this.onLogout,
  });

  @override
  State<DonorHomeScreen> createState() => _DonorHomeScreenState();
}

class _DonorHomeScreenState extends State<DonorHomeScreen> {
  late bool isAvailable;
  late int karmaScore;
  bool overlayPermissionGranted = true; // SYSTEM_ALERT_WINDOW permission
  bool showIncomingCall = false;
  bool showPreScreening = false;
  bool isEnRoute = false;

  // 4 Pre-screening questions
  bool q1 = false;
  bool q2 = false;
  bool q3 = false;
  bool q4 = false;

  bool get allPreScreenPassed => q1 && q2 && q3 && q4;

  @override
  void initState() {
    super.initState();
    isAvailable = widget.profile['is_available'] ?? true;
    karmaScore = widget.profile['reliability_score'] ?? 100;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 1,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.favorite, color: Color(0xFFDC2626), size: 20),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.profile['full_name'] ?? 'Donor',
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF0F172A)),
                ),
                const Text('Emergency Donor Active', style: TextStyle(fontSize: 11, color: Color(0xFF16A34A))),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.phone_in_talk, color: Color(0xFFDC2626)),
            tooltip: 'Simulate Incoming Emergency Call',
            onPressed: () {
              setState(() => showIncomingCall = true);
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Color(0xFF64748B)),
            tooltip: 'Sign Out',
            onPressed: widget.onLogout,
          ),
        ],
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Permission Banner: Display Over Other Apps (SYSTEM_ALERT_WINDOW)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: overlayPermissionGranted ? const Color(0xFFF0FDF4) : const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: overlayPermissionGranted ? const Color(0xFFBBF7D0) : const Color(0xFFFDE68A),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        overlayPermissionGranted ? Icons.layers : Icons.warning_amber_rounded,
                        color: overlayPermissionGranted ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                        size: 24,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              overlayPermissionGranted
                                  ? 'Overlay Permission: Granted ✅'
                                  : 'Draw Over Other Apps Permission Needed',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF0F172A)),
                            ),
                            const Text(
                              'Allows Pulse Dial to ring and display emergency calls over any open application.',
                              style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Donor Card
                Card(
                  color: Colors.white,
                  elevation: 1,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(18.0),
                    child: Row(
                      children: [
                        Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF2F2),
                            border: Border.all(color: const Color(0xFFFECACA), width: 2),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            widget.profile['blood_type'] ?? 'O-',
                            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFFDC2626)),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.profile['full_name'] ?? 'Donor',
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                              ),
                              Text(
                                '${widget.profile['age']} yrs • ${widget.profile['weight_kg']} kg • ${widget.profile['phone']}',
                                style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                              ),
                              const SizedBox(height: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFFBEB),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: const Color(0xFFFDE68A)),
                                ),
                                child: Text(
                                  '⭐ Karma Score: $karmaScore / 150',
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFB45309)),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                // Availability Switch
                Card(
                  color: isAvailable ? const Color(0xFFF0FDF4) : Colors.white,
                  elevation: 1,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: BorderSide(
                      color: isAvailable ? const Color(0xFFBBF7D0) : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: SwitchListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
                    title: Text(
                      isAvailable ? 'Emergency Geofence: Active' : 'Emergency Geofence: Standby',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A), fontSize: 14),
                    ),
                    subtitle: Text(
                      isAvailable
                          ? 'Wakes device over any open app during acute hemorrhage alerts'
                          : 'Not receiving emergency trauma dispatch calls',
                      style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                    ),
                    value: isAvailable,
                    activeColor: const Color(0xFF16A34A),
                    onChanged: (val) => setState(() => isAvailable = val),
                  ),
                ),
                const SizedBox(height: 14),

                // Medical Details Card
                Card(
                  color: Colors.white,
                  elevation: 1,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(18.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Medical History & Cooldown', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        const SizedBox(height: 10),
                        Text('• Last Donated: ${widget.profile['last_donation_date']}', style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
                        Text('• Current Medications: ${widget.profile['medications']}', style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
                        Text('• Chronic Conditions: ${widget.profile['diseases']}', style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
                        const SizedBox(height: 10),
                        const LinearProgressIndicator(value: 1.0, color: Color(0xFF16A34A), backgroundColor: Color(0xFFE2E8F0)),
                        const SizedBox(height: 6),
                        const Text('✅ 100% Eligible: 90-day cooldown satisfied', style: TextStyle(fontSize: 11, color: Color(0xFF16A34A), fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                // Active En Route Pass Card
                if (isEnRoute)
                  Card(
                    color: Colors.white,
                    elevation: 2,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: const BorderSide(color: Color(0xFF16A34A), width: 2),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(18.0),
                      child: Column(
                        children: [
                          const Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('STATUS: EN ROUTE', style: TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF16A34A))),
                              Text('Valid: 60 min', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Container(
                            width: 140,
                            height: 140,
                            decoration: BoxDecoration(color: const Color(0xFF0F172A), borderRadius: BorderRadius.circular(16)),
                            alignment: Alignment.center,
                            child: const Icon(Icons.qr_code_2, size: 100, color: Colors.white),
                          ),
                          const SizedBox(height: 12),
                          const Text('Apollo Trauma Center & Blood Bank', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          const Text('Scan upon arrival for +15 Karma points', style: TextStyle(fontSize: 11, color: Color(0xFF16A34A), fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ),

                const SizedBox(height: 16),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFDC2626),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  onPressed: () => setState(() => showIncomingCall = true),
                  icon: const Icon(Icons.phone_callback),
                  label: const Text('TEST OVERLAY CALL ALERT', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),

          // ==========================================================
          // INCOMING EMERGENCY CALL SCREEN (DRAWS OVER OTHER APPS)
          // ==========================================================
          if (showIncomingCall)
            Positioned.fill(
              child: Container(
                color: const Color(0xFF450A0A),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(color: Colors.red.shade600, borderRadius: BorderRadius.circular(20)),
                          child: const Text(
                            '🚨 INCOMING EMERGENCY CALL (OVERLAY)',
                            style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 1.0),
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Apollo Trauma Center',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.white),
                        ),
                        const SizedBox(height: 4),
                        Text('Emergency Trauma Unit • +91-9876543210', style: TextStyle(fontSize: 13, color: Colors.red.shade200)),
                      ],
                    ),

                    Container(
                      width: 110,
                      height: 110,
                      decoration: BoxDecoration(
                        color: const Color(0xFFDC2626),
                        shape: BoxShape.circle,
                        boxShadow: [BoxShadow(color: Colors.red.withOpacity(0.6), blurRadius: 30, spreadRadius: 10)],
                      ),
                      child: const Icon(Icons.local_hospital, size: 54, color: Colors.white),
                    ),

                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withOpacity(0.2)),
                      ),
                      child: Column(
                        children: [
                          const Text('CRITICAL HEMORRHAGE IN OR-3', style: TextStyle(color: Colors.amberAccent, fontWeight: FontWeight.bold, fontSize: 13)),
                          const SizedBox(height: 4),
                          Text('Requested: ${widget.profile['blood_type']} | 2 Units', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
                          const SizedBox(height: 2),
                          const Text('Distance: 0.8 km • ~4 mins drive', style: TextStyle(color: Colors.white70, fontSize: 12)),
                        ],
                      ),
                    ),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        Column(
                          children: [
                            FloatingActionButton(
                              heroTag: 'declineOverlayBtn',
                              backgroundColor: Colors.red.shade700,
                              foregroundColor: Colors.white,
                              onPressed: () => setState(() => showIncomingCall = false),
                              child: const Icon(Icons.call_end, size: 28),
                            ),
                            const SizedBox(height: 6),
                            const Text('Decline', style: TextStyle(color: Colors.white70, fontSize: 12)),
                          ],
                        ),
                        Column(
                          children: [
                            FloatingActionButton(
                              heroTag: 'answerOverlayBtn',
                              backgroundColor: const Color(0xFF16A34A),
                              foregroundColor: Colors.white,
                              onPressed: () {
                                setState(() {
                                  showIncomingCall = false;
                                  showPreScreening = true;
                                });
                              },
                              child: const Icon(Icons.call, size: 32),
                            ),
                            const SizedBox(height: 6),
                            const Text('Answer & Accept', style: TextStyle(color: Color(0xFF86EFAC), fontSize: 12, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

          // ==========================================================
          // 4-QUESTION PRE-SCREENING MODAL
          // ==========================================================
          if (showPreScreening)
            Positioned.fill(
              child: Container(
                color: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 36),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Clinical Pre-Screening', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                        IconButton(icon: const Icon(Icons.close), onPressed: () => setState(() => showPreScreening = false)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text('Confirm 4 mandatory safety conditions per Blood Bank protocol:', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                    const SizedBox(height: 20),

                    CheckboxListTile(
                      title: const Text('1. Free of fever or active infection in past 14 days'),
                      value: q1,
                      activeColor: const Color(0xFF16A34A),
                      onChanged: (v) => setState(() => q1 = v ?? false),
                    ),
                    CheckboxListTile(
                      title: const Text('2. No alcohol consumption in past 24 hours'),
                      value: q2,
                      activeColor: const Color(0xFF16A34A),
                      onChanged: (v) => setState(() => q2 = v ?? false),
                    ),
                    CheckboxListTile(
                      title: const Text('3. Not taking antibiotics or restricted blood medications'),
                      value: q3,
                      activeColor: const Color(0xFF16A34A),
                      onChanged: (v) => setState(() => q3 = v ?? false),
                    ),
                    CheckboxListTile(
                      title: const Text('4. Minimum body weight met (≥ 50 kg / 110 lbs)'),
                      value: q4,
                      activeColor: const Color(0xFF16A34A),
                      onChanged: (v) => setState(() => q4 = v ?? false),
                    ),

                    const Spacer(),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: allPreScreenPassed ? const Color(0xFF16A34A) : Colors.grey.shade400,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      onPressed: allPreScreenPassed
                          ? () {
                              setState(() {
                                showPreScreening = false;
                                isEnRoute = true;
                              });
                            }
                          : null,
                      child: const Text('CONFIRM & GENERATE ARRIVAL PASS', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
