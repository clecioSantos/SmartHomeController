/////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//       Nome: firebaseConfig
//  Descricao: Configuracao de inicializacao do Firebase e Cloud Firestore
//
//    Criacao: 26/04/2026  Clecio Santos [SHC-4]
// Modificado: 
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBGB--0KnxD3P0EwaJ83vswQxHo_vEl2GU",
  authDomain: "smarthomecontroller-ef78f.firebaseapp.com",
  projectId: "smarthomecontroller-ef78f",
  storageBucket: "smarthomecontroller-ef78f.firebasestorage.app",
  messagingSenderId: "603500536380",
  appId: "1:603500536380:web:0bcaf8abd80f31a407d939",
  measurementId: "G-ZYX4N6WHCL"
};

const app =
  !getApps().length
    ? initializeApp(firebaseConfig)
    : getApp();

export const db = getFirestore(app);