class WatchlistItem {
  final String symbol;
  final double currentPrice;
  final double? alertAbove;
  final double? alertBelow;
  final bool isSelected;

  WatchlistItem({
    required this.symbol,
    required this.currentPrice,
    this.alertAbove,
    this.alertBelow,
    this.isSelected = false,
  });

  Map<String, dynamic> toMap() {
    return {
      'symbol': symbol,
      'alertAbove': alertAbove,
      'alertBelow': alertBelow,
    };
  }

  factory WatchlistItem.fromFirestore(Map<String, dynamic> data) {
    return WatchlistItem(
      symbol: data['symbol'] ?? '',
      currentPrice: (data['currentPrice'] ?? 0.0).toDouble(),
      alertAbove: (data['alertAbove'] ?? 0.0).toDouble(),
      alertBelow: (data['alertBelow'] ?? 0.0).toDouble(),
    );
  }
}
