var admin = require("firebase-admin");

var serviceAccount = require("../serviceAccount.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

var db = admin.firestore();


function saveTokenToFirestore(tokens) {
    return db.collection('tokens').add(tokens)
        .then(docRef => {
            console.log("Token saved with ID: ", docRef.id);
        })
        .catch(error => {
            console.error("Error saving token: ", error);
        });
}

async function getAllTokens() {
    try {
        const snapshot = await db.collection('tokens').get();
        const tokens = [];
        snapshot.forEach(doc => {
            tokens.push({
                id: doc.id, 
                data: doc.data()
            });
        });
        return tokens;
    } catch (error) {
        console.error("Error retrieving tokens:", error);
        throw error;  // or handle it differently if you prefer
    }
}


module.exports = {
  db: db,
  saveTokenToFirestore : saveTokenToFirestore,
  getAllTokens: getAllTokens,
};
