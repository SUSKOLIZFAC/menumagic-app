const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const firebaseConfig = require('./firebase-applet-config.json');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function test() {
  try {
    const snapshot = await getDocs(collection(db, 'menus'));
    console.log("Success, docs:", snapshot.docs.length);
  } catch(e) {
    console.error("Firestore error:", e.message);
  }
}
test();
