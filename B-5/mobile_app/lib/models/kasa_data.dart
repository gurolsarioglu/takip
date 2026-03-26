class KasaData {
  final double totalBalance;
  final double todayPnl;
  final int activeTrades;
  final List<dynamic> history;

  KasaData({
    required this.totalBalance,
    required this.todayPnl,
    required this.activeTrades,
    this.history = const [],
  });

  factory KasaData.fromFirestore(Map<String, dynamic> data) {
    return KasaData(
      totalBalance: (data['totalBalance'] ?? 0.0).toDouble(),
      todayPnl: (data['todayPnl'] ?? 0.0).toDouble(),
      activeTrades: (data['activeTrades'] ?? 0).toInt(),
      history: data['history'] ?? [],
    );
  }
}
