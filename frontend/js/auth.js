// Import standard Firebase Client configuration from your Firebase Console Web App setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDA6Vfo-JvLynyLhQXcKiHTTTnkEnMbbLE",
    authDomain: "resqmeal-aab5b.firebaseapp.com",
    projectId: "resqmeal-aab5b",
    storageBucket: "resqmeal-aab5b.appspot.com",
    messagingSenderId: "470874689721",
    appId: "1:470874689721:web:75328ab404fcaeb5224b68"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app);

// Handle Registration
async function handleSignUp(email, password, name, phone, role) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Save additional details along with role to Firestore database
        await setDoc(doc(db, "users", user.uid), {
            name: name,
            phone: phone,
            role: role, // 'supplier', 'receiver', 'rider', 'admin'
            email: email
        });
        
        redirectUserRole(role);
    } catch (error) {
        alert("Registration failed: " + error.message);
    }
}

// Handle Login
async function handleLogin(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Retrieve the role from Firestore to determine where to route them
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
            redirectUserRole(docSnap.data().role);
        }
    } catch (error) {
        alert("Login failed: " + error.message);
    }
}

function redirectUserRole(role) {
    window.location.href = `${role}.html`;
}
