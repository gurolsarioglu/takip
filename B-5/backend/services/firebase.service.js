const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

class FirebaseService {
    constructor() {
        // User provided Firebase configuration
        const firebaseConfig = {
            apiKey: "AIzaSyCJMGXqcBmmFjdXayDs5i03YwQiQ8pCl-g",
            authDomain: "b-5-takip.firebaseapp.com",
            projectId: "b-5-takip",
            storageBucket: "b-5-takip.firebasestorage.app",
            messagingSenderId: "402313674241",
            appId: "1:402313674241:web:eb298bd7d3a5f16c504a00",
            measurementId: "G-47LGKDD2E8"
        };

        try {
            this.app = initializeApp(firebaseConfig);
            this.db = getFirestore(this.app);
            this.isInitialized = true;
            console.log('✅ Firebase Service initialized successfully with Web Config (Firestore ready)');
        } catch (error) {
            console.error('❌ Failed to initialize Firebase:', error.message);
            this.isInitialized = false;
        }
    }

    async logSignal(signalData) {
        if (!this.isInitialized || !this.db) {
            return false;
        }

        try {
            // Reference to the 'signals' collection
            const signalsRef = collection(this.db, 'signals');
            
            // Add timestamps
            const logEntry = {
                ...signalData,
                timestamp: serverTimestamp(),
                createdAt: new Date().toISOString()
            };

            const result = await addDoc(signalsRef, logEntry);
            console.log(`☁️ Signal saved to Firebase: ${signalData.coin} (${signalData.timeframe}) -> DocID: ${result.id}`);
            return true;
        } catch (error) {
            console.error('❌ Error saving signal to Firebase:', error.message);
            return false;
        }
    }
}

module.exports = new FirebaseService();
