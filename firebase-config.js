/**
 * Firebase Configuration & Firestore Helper Module
 * 
 * [Firebase 프로젝트 설정 방법]
 * 1. https://console.firebase.google.com/ 에 접속하여 로그인합니다.
 * 2. '프로젝트 추가'를 눌러 새 Firebase 프로젝트를 만듭니다.
 * 3. 웹 앱을 추가(</> 아이콘)하고 발급받은 firebaseConfig 객체 내용을 아래 주석 부분에 복사하여 붙여넣습니다.
 * 4. 왼쪽 메뉴 'Firestore Database'에서 '데이터베이스 만들기'를 누릅니다.
 * 5. 규칙(Rules) 탭에서 아래와 같이 읽기/쓰기를 허용하도록 설정합니다:
 *    rules_version = '2';
 *    service cloud.firestore {
 *      match /databases/{database}/documents {
 *        match /{document=**} {
 *          allow read, write: if true;
 *        }
 *      }
 *    }
 */

// d:\Antigravity\new-game-idea\firebase-config.js

const firebaseConfig = {
    apiKey: "AIzaSy...",            // 복사한 본인의 apiKey
    authDomain: "xxxx.firebaseapp.com",
    projectId: "xxxx",
    storageBucket: "xxxx.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:xxxx"
};

// TODO: Firebase 콘솔에서 발급받은 본인의 프로젝트 키로 대체하세요!
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Global Firebase Initialization Check
let db = null;

function initFirebase() {
    try {
        if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "YOUR_API_KEY") {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.firestore();
            console.log("🔥 Firebase Firestore 연동 성공!");
            return true;
        } else {
            console.warn("⚠️ Firebase 설정키가 적용되지 않았거나 Firebase SDK가 로드되지 않았습니다. (테스트용 모크 데이터로 동작합니다)");
            return false;
        }
    } catch (e) {
        console.error("Firebase 초기화 에러:", e);
        return false;
    }
}

// Window load 시 초기화 시도
window.addEventListener('DOMContentLoaded', () => {
    initFirebase();
});
