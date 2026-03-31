import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'services/firebase_service.dart';
import 'services/notification_service.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Note: Firebase.initializeApp() will require platform-specific configuration 
  // which user needs to provide (google-services.json / GoogleService-Info.plist)
  try {
    await Firebase.initializeApp(
      options: const FirebaseOptions(
        apiKey: "AIzaSyCJMGXqcBmmFjdXayDs5i03YwQiQ8pCl-g",
        authDomain: "b-5-takip.firebaseapp.com",
        projectId: "b-5-takip",
        storageBucket: "b-5-takip.firebasestorage.app",
        messagingSenderId: "402313674241",
        appId: "1:402313674241:web:eb298bd7d3a5f16c504a00",
        measurementId: "G-47LGKDD2E8",
      ),
    );
    await NotificationService().initialize();
  } catch (e) {
    print("Firebase init failed: $e. Handled for now to allow UI development.");
  }
  
  runApp(
    MultiProvider(
      providers: [
        Provider<FirebaseService>(create: (_) => FirebaseService()),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'B-5 Crypto Tracker',
      theme: ThemeData(
        brightness: Brightness.dark,
        primarySwatch: Colors.green,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        cardTheme: CardThemeData(
          color: const Color(0xFF1E293B),
          elevation: 4,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      home: const AuthWrapper(),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    final firebaseService = Provider.of<FirebaseService>(context);
    return firebaseService.currentUser != null 
        ? const HomeScreen() 
        : const LoginScreen();
  }
}
