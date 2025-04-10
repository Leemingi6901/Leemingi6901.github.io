const admin = require("firebase-admin");
const serviceAccount = require("./firebase-key.json"); // Firebase 인증키

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

exports.handler = async function(event) {
  const slug = event.queryStringParameters.slug;
  if (!slug) {
    return {
      statusCode: 400,
      body: 'Missing slug'
    };
  }

  const docRef = db.collection("postViews").doc(slug);
  const doc = await docRef.get();

  let currentViews = 0;
  if (doc.exists) {
    currentViews = doc.data().views || 0;
  }

  await docRef.set({ views: currentViews + 1 });

  return {
    statusCode: 200,
    body: JSON.stringify({ views: currentViews + 1 }),
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  };
};
