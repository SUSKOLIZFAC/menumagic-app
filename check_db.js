import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || ''));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function check() {
  const menusSnap = await db.collection('menus').limit(1).get();
  if (menusSnap.empty) {
    console.log("No menus found.");
    return;
  }
  const menu = menusSnap.docs[0].data();
  let hasCustomImages = false;
  menu.categories?.forEach(c => {
    c.items?.forEach(i => {
      if (i.imageUrl) {
        console.log(`Found custom image ID on item ${i.name}: ${i.imageUrl}`);
        hasCustomImages = true;
      }
    })
  });
  if (!hasCustomImages) console.log("No custom images found in the menu.");
}
check().catch(console.error);
