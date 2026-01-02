import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../lib/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Sirf user ka data fetch kar rahe hain, status update nahi
        const userRef = doc(db, "users", firebaseUser.uid);
        const unsubDoc = onSnapshot(userRef, (docSnap) => {
           if(docSnap.exists()) {
               setUser({ ...firebaseUser, ...docSnap.data() });
           } else {
               setUser(firebaseUser);
           }
           setLoading(false);
        });
        return () => unsubDoc(); 
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);