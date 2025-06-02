// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Suas credenciais do Firebase (do console do Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyDQjRv_HlOKY3g5ebq_cK577_Os53kgWpc",
  authDomain: "cs-nutri.firebaseapp.com",
  databaseURL: "https://cs-nutri-default-rtdb.firebaseio.com",
  projectId: "cs-nutri",
  storageBucket: "cs-nutri.firebasestorage.app",
  messagingSenderId: "398504414133",
  appId: "1:398504414133:web:5daf6bcb439a494759e7fc",
  measurementId: "G-K350KXKX05"
};


// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta as instâncias dos serviços que você vai usar
export const auth = getAuth(app);
export const db = getFirestore(app);