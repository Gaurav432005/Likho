import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { Layout } from "./components/layout/Layout";
import DomainChangeBanner from "./DomainChangeBanner";
import InstallPrompt from "./components/ui/InstallPrompt";

// Features
import AuthPage from "./features/auth/AuthPage";
import Home from "./features/feed/Home";
import Create from "./features/feed/Create";
import Diary from "./features/feed/Diary";
import ViewPost from "./features/feed/ViewPost";
import ChatList from "./features/chat/ChatList";
import ChatWindow from "./features/chat/ChatWindow";
import Profile from "./features/user/Profile"; 

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-white text-black font-bold">LOADING...</div>;
  if (!user) return <Navigate to="/auth" />;
  return children;
};

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);

  return (
   
    <AuthProvider>
      <NotificationProvider>
       
      <DomainChangeBanner />
         <InstallPrompt />
        <Toaster
            position="top-center"
            toastOptions={{
            duration: 3000,
            style: {
                background: "#000",
                color: "#fff",
                borderRadius: "12px",
                border: "1px solid #333",
                padding: "12px 16px",
            },
            }}
            containerStyle={{ top: 16 }}
        />

        <Routes>
            <Route path="/auth" element={<AuthPage />} />
            
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Home />} />
                <Route path="diary" element={<Diary />} />
                <Route path="create" element={<Create />} />
                <Route path="view/:collectionName/:id" element={<ViewPost />} />
                <Route path="chat" element={<ChatList />} />
                <Route path="chat/:chatId" element={<ChatWindow />} />
                <Route path="profile/:userId" element={<Profile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </NotificationProvider>
    </AuthProvider>
  );
}