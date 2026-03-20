import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth as firebaseAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  db as firebaseDb,
  doc,
  setDoc,
  serverTimestamp,
} from '@/lib/firebase';

// Cast to any to satisfy MockAuth/MockFirestore expectations in services
const auth = firebaseAuth as any;
const db = firebaseDb as any;
const onAuthStateChanged = firebaseOnAuthStateChanged as any;
import type { User } from '@/types';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth as any, (user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null } | null) => {
        if (user) {
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
          });
        } else {
          setCurrentUser(null);
        }
        setLoading(false);
      });
 
      return unsubscribe;
    }, []);

  async function login(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create/update user doc in Firestore
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      lastLoginAt: serverTimestamp(),
    }, { merge: true });
  }

  async function register(email: string, password: string, displayName: string) {
    const { user }: any = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName });

    // Store user doc in Firestore
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName,
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    }, { merge: true });
  }

  async function logout() {
    await signOut(auth);
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    // Force Google Sign-In to select an account and optionally prompt
    (provider as any).setCustomParameters({
      prompt: 'select_account'
    });

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    if (user.email && !user.email.toLowerCase().endsWith('@gmail.com')) {
      await signOut(auth);
      throw new Error('Only @gmail.com accounts are allowed to log in.');
    }

    // Store user doc in Firestore
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      lastLoginAt: serverTimestamp(),
    }, { merge: true });
  }


  const value = {
    currentUser,
    loading,
    login,
    register,
    logout,
    loginWithGoogle,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
