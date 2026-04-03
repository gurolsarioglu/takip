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
            this.apiDisabled = false; // Flag to track if Firestore API is disabled in GCP
            console.log('✅ Firebase Service initialized successfully with Web Config (Firestore ready)');
        } catch (error) {
            console.error('❌ Failed to initialize Firebase:', error.message);
            this.isInitialized = false;
        }
    }

    async logSignal(signalData) {
        // Skip if not initialized or if we've already detected the API is disabled
        if (!this.isInitialized || !this.db || this.apiDisabled) {
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
            // Check if it's the "API not enabled" error
            if (error.message && error.message.includes('PERMISSION_DENIED') && error.message.includes('API has not been used')) {
                this.apiDisabled = true;
                console.warn('\n⚠️ [Firebase Notice]: Cloud Firestore API is not enabled for project "b-5-takip".');
                console.warn('👉 To enable it, visit: https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=b-5-takip');
                console.warn('🔇 Firebase logging has been temporarily disabled to reduce log noise.\n');
            } else {
                console.error('❌ Error saving signal to Firebase:', error.message);
            }
            return false;
        }
    }
}

module.exports = new FirebaseService();
