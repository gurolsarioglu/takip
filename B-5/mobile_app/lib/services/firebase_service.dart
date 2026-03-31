import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/signal.dart';
import '../models/watchlist_item.dart';
import '../models/kasa_data.dart';

class FirebaseService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Stream of signals ordered by timestamp
  Stream<List<Signal>> getSignals() {
    return _db
        .collection('signals')
        .orderBy('timestamp', descending: true)
        .limit(50)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => Signal.fromFirestore(doc)).toList());
  }

  // Auth methods
  Future<UserCredential?> signUp(String email, String password) async {
    try {
      return await _auth.createUserWithEmailAndPassword(email: email, password: password);
    } catch (e) {
      print('Sign Up Error: $e');
      return null;
    }
  }

  Future<UserCredential?> signIn(String email, String password) async {
    // Local bypass for easy testing
    if (email == 'admin' && password == '123456') {
      return null; // We will handle this in UI as a 'success'
    }
    try {
      return await _auth.signInWithEmailAndPassword(email: email, password: password);
    } catch (e) {
      print('Sign In Error: $e');
      return null;
    }
  }

  // Helper to check if we are in 'test mode'
  bool isTestUser(String email, String password) {
    return email == 'admin' && password == '123456';
  }

  Future<void> signOut() async {
    await _auth.signOut();
  }

  // Watchlist methods
  Stream<List<WatchlistItem>> getWatchlist() {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return Stream.value([]);
    return _db
        .collection('users')
        .doc(uid)
        .collection('watchlist')
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => WatchlistItem.fromFirestore(doc.data()))
            .toList());
  }

  Future<void> addToWatchlist(WatchlistItem item) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return;
    await _db
        .collection('users')
        .doc(uid)
        .collection('watchlist')
        .doc(item.symbol)
        .set(item.toMap());
  }

  // Kasa methods
  Stream<KasaData> getKasaData() {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return Stream.value(KasaData(totalBalance: 0, todayPnl: 0, activeTrades: 0));
    return _db
        .collection('users')
        .doc(uid)
        .collection('kasa_summary')
        .snapshots()
        .map((snapshot) => snapshot.docs.isNotEmpty 
            ? KasaData.fromFirestore(snapshot.docs.first.data()) 
            : KasaData(totalBalance: 0, todayPnl: 0, activeTrades: 0));
  }

  User? get currentUser => _auth.currentUser;
}
