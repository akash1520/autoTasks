import * as admin from 'firebase-admin';

// Make sure the path is correct, depending on your file structure
import serviceAccount from '../../serviceAccount.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

const db = admin.firestore();

interface TokenDocument {
    id: string;
    data: any; // specify a more concrete type if you know the structure of token data
}

function saveTokenToFirestore(tokens: any): Promise<void> { // Replace 'any' with a proper type if you have one
    return db.collection('tokens').add(tokens)
        .then(docRef => {
            console.log("Token saved with ID: ", docRef.id);
        })
        .catch(error => {
            console.error("Error saving token: ", error);
        });
}

async function getAllTokens(): Promise<TokenDocument[]> {
    try {
        const snapshot = await db.collection('tokens').get();
        const tokens: TokenDocument[] = [];
        snapshot.forEach(doc => {
            tokens.push({
                id: doc.id,
                data: doc.data()
            });
        });
        return tokens;
    } catch (error) {
        console.error("Error retrieving tokens:", error);
        throw error;
    }
}

export {
    db,
    saveTokenToFirestore,
    getAllTokens
};
