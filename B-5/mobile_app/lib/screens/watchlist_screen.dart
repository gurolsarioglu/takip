import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/firebase_service.dart';
import '../models/watchlist_item.dart';

class WatchlistScreen extends StatelessWidget {
  const WatchlistScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final service = Provider.of<FirebaseService>(context);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('İZLEME LİSTESİ'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              // TODO: Add search and add functionality
            },
          ),
        ],
      ),
      body: StreamBuilder<List<WatchlistItem>>(
        stream: service.getWatchlist(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: Colors.green));
          }
          final items = snapshot.data ?? [];
          if (items.isEmpty) {
            return const Center(child: Text('Listeniz boş. Coin ekleyin!'));
          }
          return ListView.builder(
            itemCount: items.length,
            padding: const EdgeInsets.all(8),
            itemBuilder: (context, index) {
              final item = items[index];
              return ListTile(
                title: Text(item.symbol, style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text('Başı: ${item.alertAbove} | Sonu: ${item.alertBelow}'),
                trailing: Text('\$${item.currentPrice}', style: const TextStyle(color: Colors.greenAccent)),
                leading: const Icon(Icons.star, color: Colors.amber),
                tileColor: const Color(0xFF1E293B),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              );
            },
          );
        },
      ),
    );
  }
}
