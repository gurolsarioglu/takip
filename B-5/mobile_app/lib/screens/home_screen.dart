import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/firebase_service.dart';
import '../models/signal.dart';
import '../widgets/signal_card.dart';
import 'watchlist_screen.dart';
import 'kasa_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  
  final List<Widget> _pages = [
    const SignalListSection(),
    const WatchlistScreen(),
    const KasaScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final service = Provider.of<FirebaseService>(context, listen: false);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: IndexedStack(
        index: _currentIndex,
        children: _pages,
      ),
      bottomNavigationBar: BottomNavigationBar(
        backgroundColor: const Color(0xFF1E293B),
        selectedItemColor: Colors.green,
        unselectedItemColor: Colors.white60,
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_filled), label: 'Sinyaller'),
          BottomNavigationBarItem(icon: Icon(Icons.star_border_rounded), label: 'İzleme'),
          BottomNavigationBarItem(icon: Icon(Icons.account_balance_wallet_outlined), label: 'Kasa'),
        ],
      ),
    );
  }
}

class SignalListSection extends StatelessWidget {
  const SignalListSection({super.key});

  @override
  Widget build(BuildContext context) {
    final service = Provider.of<FirebaseService>(context, listen: false);
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('B-5 SİNYALLER', style: TextStyle(letterSpacing: 1.2, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_outlined),
            onPressed: () => service.signOut(),
          ),
        ],
      ),
      body: StreamBuilder<List<Signal>>(
        stream: service.getSignals(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: Colors.green));
          }
          if (snapshot.hasError) {
            return Center(child: Text('Hata: ${snapshot.error}'));
          }
          final signals = snapshot.data ?? [];
          if (signals.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.radar, size: 64, color: Colors.white.withOpacity(0.2)),
                  const SizedBox(height: 16),
                  const Text('Henüz sinyal tespit edilmedi.'),
                ],
              ),
            );
          }
          return ListView.builder(
            itemCount: signals.length,
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
            itemBuilder: (context, index) {
              return SignalCard(signal: signals[index]);
            },
          );
        },
      ),
    );
  }
}
