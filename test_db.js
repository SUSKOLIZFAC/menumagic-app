import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
console.log('Config:', config);

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  try {
    const snap = await getDocs(collection(db, 'restaurants'));
    console.log('Restaurants count:', snap.size);
    snap.forEach(doc => console.log(doc.id, doc.data().name));
  } catch (e) {
    console.error('Error:', e.message);
  }
}
test();
