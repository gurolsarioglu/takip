import 'package:flutter/material.dart';
import '../models/signal.dart';
import 'package:intl/intl.dart';

class SignalCard extends StatelessWidget {
  final Signal signal;

  const SignalCard({super.key, required this.signal});

  @override
  Widget build(BuildContext context) {
    bool isLong = signal.position.toUpperCase().contains('LONG') || signal.position.toUpperCase().contains('BUY');
    Color accentColor = isLong ? Colors.greenAccent : Colors.redAccent;
    String timeStr = DateFormat('HH:mm').format(signal.timestamp);

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
      elevation: 4,
      child: InkWell(
        onTap: () {
          // TODO: Navigate to detail view
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border(left: BorderSide(color: accentColor, width: 6)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '#${signal.coin} [${signal.timeframe}]',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    timeStr,
                    style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 12),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        signal.position,
                        style: TextStyle(color: accentColor, fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Fiyat: ${signal.price.toStringAsFixed(4)}',
                        style: const TextStyle(fontSize: 14),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'RSI: ${signal.lastRsi.round()} ${signal.isKusursuz ? '⭐' : ''}',
                        style: const TextStyle(fontSize: 13),
                      ),
                      Text(
                        'Dolaşım: ${signal.supplyStr}',
                        style: TextStyle(
                          fontSize: 11,
                          color: signal.supplyStr.contains('!!!') ? Colors.amber : Colors.white60,
                        ),
                      ),
                    ],
                  )
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
