import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/firebase_service.dart';
import '../models/kasa_data.dart';

class KasaScreen extends StatelessWidget {
  const KasaScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final service = Provider.of<FirebaseService>(context);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('KASA DEFTERİ'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: StreamBuilder<KasaData>(
        stream: service.getKasaData(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: Colors.green));
          }
          final data = snapshot.data ?? KasaData(totalBalance: 0, todayPnl: 0, activeTrades: 0);

          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                _buildBalanceCard(data),
                const SizedBox(height: 24),
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text('SON İŞLEMLER', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white60)),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: ListView.builder(
                    itemCount: data.history.length,
                    itemBuilder: (context, index) {
                      return const ListTile(
                        leading: Icon(Icons.history, color: Colors.blueAccent),
                        title: Text('Örnek İşlem Logu'),
                        subtitle: Text('26 Mart 2026'),
                      );
                    },
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildBalanceCard(KasaData data) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF1E293B), Color(0xFF334155)]),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 10)],
      ),
      child: Column(
        children: [
          const Text('TOPLAM BAKİYE', style: TextStyle(fontSize: 12, color: Colors.white60)),
          const SizedBox(height: 8),
          Text(
            '\$${data.totalBalance.toStringAsFixed(2)}',
            style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.greenAccent),
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildStat('Bugün PnL', '+\$${data.todayPnl}', Colors.green),
              _buildStat('Aktif İşlem', '${data.activeTrades}', Colors.amber),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStat(String label, String value, Color color) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.white60)),
        const SizedBox(height: 4),
        Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
      ],
    );
  }
}
