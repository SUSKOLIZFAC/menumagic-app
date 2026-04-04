import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import AdminDashboard from './pages/AdminDashboard';
import RestaurantMenu from './pages/RestaurantMenu';
import Login from './pages/Login';

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  
  const allowedEmails = ['ahmedbahloul230@gmail.com', 'ali@onemenu.app'];
  if (!user || !user.email || !allowedEmails.includes(user.email.toLowerCase())) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/menu/:restaurantId" element={<RestaurantMenu />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
