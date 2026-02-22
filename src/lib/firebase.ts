// Firebase implementation – real SDK (when env vars present) or mock (localStorage)
import { initializeApp as firebaseInitializeApp } from 'firebase/app';
import {
  getAuth as firebaseGetAuth,
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  signInWithPopup as firebaseSignInWithPopup,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  GoogleAuthProvider as FirebaseGoogleAuthProvider,
} from 'firebase/auth';
import {
  getFirestore as firebaseGetFirestore,
  collection as firebaseCollection,
  doc as firebaseDoc,
  addDoc as firebaseAddDoc,
  getDoc as firebaseGetDoc,
  getDocs as firebaseGetDocs,
  setDoc as firebaseSetDoc,
  updateDoc as firebaseUpdateDoc,
  deleteDoc as firebaseDeleteDoc,
  query as firebaseQuery,
  where as firebaseWhere,
  orderBy as firebaseOrderBy,
  serverTimestamp as firebaseServerTimestamp,
  arrayUnion as firebaseArrayUnion,
  arrayRemove as firebaseArrayRemove,
  type WhereFilterOp,
  type OrderByDirection,
} from 'firebase/firestore';

// Mock implementation for demo purposes
// Uses localStorage for data persistence

export interface MockUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Generate a unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Mock Auth
class MockAuth {
  currentUser: MockUser | null = null;
  private listeners: ((user: MockUser | null) => void)[] = [];

  constructor() {
    // Check for existing session
    const savedUser = localStorage.getItem('socialtab_currentUser');
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
    }
  }

  onAuthStateChanged(callback: (user: MockUser | null) => void) {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.currentUser));
  }

  async createUserWithEmailAndPassword(email: string, password: string) {
    const users = JSON.parse(localStorage.getItem('socialtab_users') || '[]');
    const existingUser = users.find((u: any) => u.email === email);
    if (existingUser) {
      throw new Error('Email already in use');
    }

    const newUser: MockUser = {
      uid: generateId(),
      email,
      displayName: null,
      photoURL: null,
    };

    users.push({ ...newUser, password });
    localStorage.setItem('socialtab_users', JSON.stringify(users));

    this.currentUser = newUser;
    localStorage.setItem('socialtab_currentUser', JSON.stringify(newUser));
    this.notifyListeners();

    return { user: newUser };
  }

  async signInWithEmailAndPassword(email: string, password: string) {
    const users = JSON.parse(localStorage.getItem('socialtab_users') || '[]');
    const user = users.find((u: any) => u.email === email && u.password === password);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const { password: _, ...userWithoutPassword } = user;
    this.currentUser = userWithoutPassword;
    localStorage.setItem('socialtab_currentUser', JSON.stringify(userWithoutPassword));
    this.notifyListeners();

    return { user: userWithoutPassword };
  }

  async signInWithPopup(_provider: any) {
    // Mock Google sign-in
    const mockGoogleUser: MockUser = {
      uid: generateId(),
      email: `user${Date.now()}@gmail.com`,
      displayName: 'Google User',
      photoURL: null,
    };

    this.currentUser = mockGoogleUser;
    localStorage.setItem('socialtab_currentUser', JSON.stringify(mockGoogleUser));
    this.notifyListeners();

    return { user: mockGoogleUser };
  }

  async signOut() {
    this.currentUser = null;
    localStorage.removeItem('socialtab_currentUser');
    this.notifyListeners();
  }

  async updateProfile(user: MockUser, profile: { displayName?: string | null; photoURL?: string | null }) {
    const users = JSON.parse(localStorage.getItem('socialtab_users') || '[]');
    const userIndex = users.findIndex((u: any) => u.uid === user.uid);

    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], ...profile };
      localStorage.setItem('socialtab_users', JSON.stringify(users));
    }

    this.currentUser = { ...user, ...profile };
    localStorage.setItem('socialtab_currentUser', JSON.stringify(this.currentUser));
    this.notifyListeners();
  }
}

// Mock Firestore
class MockFirestore {
  private getCollection(collectionName: string) {
    return JSON.parse(localStorage.getItem(`socialtab_${collectionName}`) || '[]');
  }

  private setCollection(collectionName: string, data: any[]) {
    localStorage.setItem(`socialtab_${collectionName}`, JSON.stringify(data));
  }

  collection(name: string) {
    return {
      add: async (data: any) => {
        const items = this.getCollection(name);
        const newItem = { id: generateId(), ...data, createdAt: new Date().toISOString() };
        items.push(newItem);
        this.setCollection(name, items);
        return { id: newItem.id };
      },
      get: async () => {
        const items = this.getCollection(name);
        return {
          docs: items.map((item: any) => ({
            id: item.id,
            data: () => item,
          })),
          forEach: (callback: any) => {
            items.forEach((item: any) => callback({ id: item.id, data: () => item }));
          },
        };
      },
      where: (_field: string, _op: string, _value: any) => this.collection(name),
      orderBy: (_field: string, _direction: string) => this.collection(name),
    };
  }

  doc(collectionName: string, id: string) {
    const items = this.getCollection(collectionName);
    const itemIndex = items.findIndex((item: any) => item.id === id);

    return {
      get: async () => {
        const item = items.find((i: any) => i.id === id);
        return {
          exists: () => !!item,
          data: () => item,
          id,
        };
      },
      set: async (data: any, options?: { merge: boolean }) => {
        if (itemIndex !== -1) {
          if (options?.merge) {
            items[itemIndex] = { ...items[itemIndex], ...data };
          } else {
            items[itemIndex] = { id, ...data };
          }
        } else {
          items.push({ id, ...data });
        }
        this.setCollection(collectionName, items);
      },
      update: async (data: any) => {
        if (itemIndex !== -1) {
          items[itemIndex] = { ...items[itemIndex], ...data };
          this.setCollection(collectionName, items);
        }
      },
      delete: async () => {
        if (itemIndex !== -1) {
          items.splice(itemIndex, 1);
          this.setCollection(collectionName, items);
        }
      },
    };
  }
}

// Mock Firebase App
const mockApp = {};
const mockAuth = new MockAuth();
const mockDb = new MockFirestore();

// Helper functions to match Firebase API (mock implementations)
function mockGetAuth() {
  return mockAuth;
}

function mockGetFirestore() {
  return mockDb;
}

function mockInitializeApp(_config: any) {
  return mockApp;
}

function mockOnAuthStateChanged(authInstance: MockAuth, callback: (user: MockUser | null) => void) {
  return authInstance.onAuthStateChanged(callback);
}

function mockCreateUserWithEmailAndPassword(authInstance: MockAuth, email: string, password: string) {
  return authInstance.createUserWithEmailAndPassword(email, password);
}

function mockSignInWithEmailAndPassword(authInstance: MockAuth, email: string, password: string) {
  return authInstance.signInWithEmailAndPassword(email, password);
}

function mockSignInWithPopup(authInstance: MockAuth, provider: any) {
  return authInstance.signInWithPopup(provider);
}

function mockSignOut(authInstance: MockAuth) {
  return authInstance.signOut();
}

function mockUpdateProfile(user: MockUser, profile: { displayName?: string | null; photoURL?: string | null }) {
  return mockAuth.updateProfile(user, profile);
}

// Firestore mock helpers
function mockCollection(dbInstance: MockFirestore, name: string) {
  return dbInstance.collection(name);
}

function mockDoc(dbInstance: MockFirestore, collectionName: string, id: string) {
  return dbInstance.doc(collectionName, id);
}

function mockAddDoc(collectionRef: any, data: any) {
  return collectionRef.add(data);
}

function mockGetDoc(docRef: any) {
  return docRef.get();
}

function mockGetDocs(queryRef: any) {
  return queryRef.get();
}

function mockUpdateDoc(docRef: any, data: any) {
  return docRef.update(data);
}

function mockSetDoc(docRef: any, data: any, options: { merge: boolean } = { merge: false }) {
  return docRef.set(data, options);
}

function mockDeleteDoc(docRef: any) {
  return docRef.delete();
}

function mockQuery(collectionRef: any, ..._constraints: any[]) {
  return collectionRef;
}

function mockWhere(field: string, op: string, value: any) {
  return { field, op, value };
}

function mockOrderBy(field: string, direction: string = 'asc') {
  return { field, direction };
}

function mockArrayUnion(...items: any[]) {
  return { __op: 'arrayUnion', items };
}

function mockArrayRemove(...items: any[]) {
  return { __op: 'arrayRemove', items };
}

function mockServerTimestamp() {
  return new Date().toISOString();
}

// --- Real Firebase initialization (when env vars present) ---

let realApp: any = null;
let realAuth: any = null;
let realDb: any = null;

const useRealFirebase = Boolean(import.meta.env.VITE_FIREBASE_API_KEY);

if (useRealFirebase) {
  try {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "fairshare-pwa.firebaseapp.com",
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "fairshare-pwa",
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "fairshare-pwa.firebasestorage.app",
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "468726458796",
      appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:468726458796:web:65833edf2672921e08f209",
    };

    realApp = firebaseInitializeApp(firebaseConfig);
    realAuth = firebaseGetAuth(realApp);
    realDb = firebaseGetFirestore(realApp);
  } catch (err) {
    console.error('Firebase initialization failed:', err);
    realApp = null;
    realAuth = null;
    realDb = null;
  }
}

// Real wrappers
const realOnAuthStateChanged = (authInst: any, cb: any) => firebaseOnAuthStateChanged(authInst, cb);
const realCreateUserWithEmailAndPassword = (authInst: any, email: string, password: string) =>
  firebaseCreateUserWithEmailAndPassword(authInst, email, password);
const realSignInWithEmailAndPassword = (authInst: any, email: string, password: string) =>
  firebaseSignInWithEmailAndPassword(authInst, email, password);
const realSignInWithPopup = (authInst: any, provider: any) => firebaseSignInWithPopup(authInst, provider);
const realSignOut = (authInst: any) => firebaseSignOut(authInst);
const realUpdateProfile = (user: any, profile: any) => firebaseUpdateProfile(user, profile);

const realCollectionFn = (dbInst: any, name: string) => firebaseCollection(dbInst, name);
const realDocFn = (dbInst: any, collectionName: string, id: string) => firebaseDoc(dbInst, collectionName, id);
const realAddDocFn = (collectionRef: any, data: any) => firebaseAddDoc(collectionRef, data);
const realGetDocFn = (docRef: any) => firebaseGetDoc(docRef);
const realGetDocsFn = (queryRef: any) => firebaseGetDocs(queryRef);
const realUpdateDocFn = (docRef: any, data: any) => firebaseUpdateDoc(docRef, data);
const realSetDocFn = (docRef: any, data: any, options: any) => firebaseSetDoc(docRef, data, options);
const realDeleteDocFn = (docRef: any) => firebaseDeleteDoc(docRef);
const realQueryFn = (collectionRef: any, ...constraints: any[]) => firebaseQuery(collectionRef, ...constraints);
const realWhereFn = (field: string, op: WhereFilterOp, value: any) => firebaseWhere(field, op, value);
const realOrderByFn = (field: string, direction: OrderByDirection = 'asc') => firebaseOrderBy(field, direction);
const realArrayUnionFn = (...items: any[]) => firebaseArrayUnion(...items);
const realArrayRemoveFn = (...items: any[]) => firebaseArrayRemove(...items);
const realServerTimestampFn = () => firebaseServerTimestamp();

// Exported API (choose real or mock at runtime)
export const app = useRealFirebase && realApp ? realApp : mockApp;
export const auth = useRealFirebase && realAuth ? realAuth : mockAuth;
export const db = useRealFirebase && realDb ? realDb : mockDb;

export const getAuth = useRealFirebase && realAuth ? () => realAuth : mockGetAuth;
export const getFirestore = useRealFirebase && realDb ? () => realDb : mockGetFirestore;
export const initializeApp = useRealFirebase && realApp ? () => realApp : mockInitializeApp;
export const onAuthStateChanged = useRealFirebase && realAuth ? realOnAuthStateChanged : mockOnAuthStateChanged;
export const createUserWithEmailAndPassword = useRealFirebase && realAuth ? realCreateUserWithEmailAndPassword : mockCreateUserWithEmailAndPassword;
export const signInWithEmailAndPassword = useRealFirebase && realAuth ? realSignInWithEmailAndPassword : mockSignInWithEmailAndPassword;
export const signInWithPopup = useRealFirebase && realAuth ? realSignInWithPopup : mockSignInWithPopup;
export const signOut = useRealFirebase && realAuth ? realSignOut : mockSignOut;
export const updateProfile = useRealFirebase && realAuth ? realUpdateProfile : mockUpdateProfile;
export const GoogleAuthProvider = useRealFirebase && realAuth ? FirebaseGoogleAuthProvider : class GoogleAuthProvider { setCustomParameters(_params: any) { } };

export const collection = useRealFirebase && realDb ? realCollectionFn : mockCollection;
export const doc = useRealFirebase && realDb ? realDocFn : mockDoc;
export const addDoc = useRealFirebase && realDb ? realAddDocFn : mockAddDoc;
export const getDoc = useRealFirebase && realDb ? realGetDocFn : mockGetDoc;
export const getDocs = useRealFirebase && realDb ? realGetDocsFn : mockGetDocs;
export const updateDoc = useRealFirebase && realDb ? realUpdateDocFn : mockUpdateDoc;
export const setDoc = useRealFirebase && realDb ? realSetDocFn : mockSetDoc;
export const deleteDoc = useRealFirebase && realDb ? realDeleteDocFn : mockDeleteDoc;
export const query = useRealFirebase && realDb ? realQueryFn : mockQuery;
export const where = useRealFirebase && realDb ? realWhereFn : mockWhere;
export const orderBy = useRealFirebase && realDb ? realOrderByFn : mockOrderBy;
export const arrayUnion = useRealFirebase && realDb ? realArrayUnionFn : mockArrayUnion;
export const arrayRemove = useRealFirebase && realDb ? realArrayRemoveFn : mockArrayRemove;
export const serverTimestamp = useRealFirebase && realDb ? realServerTimestampFn : mockServerTimestamp;

