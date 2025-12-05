import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/layout/Layout";

// Pages
import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";
import Diary from "./pages/Diary";
import Create from "./pages/Create";
import Settings from "./pages/Settings";
import ViewPost from "./pages/ViewPost";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Toaster position="top-center" toastOptions={{ className: "font-sans font-medium" }} />
      
      <Routes>
        <Route path="/auth" element={<AuthPage />} />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Home />} />
          <Route path="diary" element={<Diary />} />
          <Route path="create" element={<Create />} />
          <Route path="settings" element={<Settings />} />
          <Route path="view/:collectionName/:id" element={<ViewPost />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthProvider>
  );
}