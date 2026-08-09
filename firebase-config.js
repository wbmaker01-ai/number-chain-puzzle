/**
 * Firebase Configuration & Firestore Helper Module
 * Real Firebase Connection: number-chain-puzzle-34fd7
 */

var firebaseConfig = {
    apiKey: "AIzaSyC6FtCQ2T6xWZrAcgYEc2smeU8IVeoX34U",
    authDomain: "number-chain-puzzle-34fd7.firebaseapp.com",
    projectId: "number-chain-puzzle-34fd7",
    storageBucket: "number-chain-puzzle-34fd7.firebasestorage.app",
    messagingSenderId: "246688446907",
    appId: "1:246688446907:web:05362707a83779803cac9e",
    measurementId: "G-S5FVTHELG7"
};

// Global Firebase Initialization Check
var db = null;

function initFirebase() {
    try {
        if (typeof firebase !== 'undefined' && firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.firestore();
            console.log("🔥 Firebase Firestore 연동 성공!");
            return true;
        } else {
            console.warn("⚠️ Firebase SDK가 로드되지 않았습니다.");
            return false;
        }
    } catch (e) {
        console.error("Firebase 초기화 에러:", e);
        return false;
    }
}

// Ensure initFirebase executes whether DOM is loading or already loaded
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => initFirebase());
} else {
    initFirebase();
}
