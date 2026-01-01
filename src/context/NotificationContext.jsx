import { createContext, useContext, useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [hasUnreadMessage, setHasUnreadMessage] = useState(false);

  useEffect(() => {
    if (!user) {
        setHasUnreadMessage(false);
        return;
    }

  
    const q = query(collection(db, "chats"), where("users", "array-contains", user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
 
        const unreadFound = snapshot.docs.some(doc => {
            const data = doc.data();
            return (
                data.lastMessageSenderId && 
                data.lastMessageSenderId !== user.uid && 
                data.receiverHasRead === false
            );
        });
        
        setHasUnreadMessage(unreadFound);
    }, (error) => {
        console.error("Notification Error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <NotificationContext.Provider value={{ hasUnreadMessage }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);