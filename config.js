// =====================================================================
// config.js — lo ÚNICO que cambia entre un cliente y otro.
// Para un negocio nuevo: copia index.html + este archivo, y edita aquí.
// =====================================================================
const BUSINESS_NAME = 'Marisquería Pargo';

// Consola de Firebase > Configuración del proyecto > Tus apps > SDK
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDseU2Tk27KgZuvgy9zT9z4q8k45xPaofI",
  authDomain: "marisqueria-pargo.firebaseapp.com",
  projectId: "marisqueria-pargo",
  storageBucket: "marisqueria-pargo.firebasestorage.app",
  messagingSenderId: "360792561354",
  appId: "1:360792561354:web:166bf08abe2c459ebc0633"
};
const FIRESTORE_ROOM_DOC = 'marisqueria-pargo';

try { document.title = BUSINESS_NAME + ' - Punto de Venta'; } catch (e) {}
