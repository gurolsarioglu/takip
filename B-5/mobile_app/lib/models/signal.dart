import 'package:cloud_firestore/cloud_firestore.dart';

class Signal {
  final String id;
  final String coin;
  final String timeframe;
  final String position;
  final double price;
  final double lastRsi;
  final double stochK;
  final double stochD;
  final String supplyStr;
  final DateTime timestamp;
  final bool isKusursuz;
  final Map<String, dynamic> rawData;

  Signal({
    required this.id,
    required this.coin,
    required this.timeframe,
    required this.position,
    required this.price,
    required this.lastRsi,
    required this.stochK,
    required this.stochD,
    required this.supplyStr,
    required this.timestamp,
    this.isKusursuz = false,
    required this.rawData,
  });

  factory Signal.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Signal(
      id: doc.id,
      coin: data['coin'] ?? 'Unknown',
      timeframe: data['timeframe'] ?? 'N/A',
      position: data['position'] ?? 'N/A',
      price: (data['price'] ?? 0.0).toDouble(),
      lastRsi: (data['lastRsi'] ?? 0.0).toDouble(),
      stochK: (data['stochK'] ?? 0.0).toDouble(),
      stochD: (data['stochD'] ?? 0.0).toDouble(),
      supplyStr: data['supplyStr'] ?? 'N/A',
      timestamp: (data['timestamp'] as Timestamp?)?.toDate() ?? DateTime.now(),
      isKusursuz: data['isKusursuz'] ?? false,
      rawData: data,
    );
  }
}
