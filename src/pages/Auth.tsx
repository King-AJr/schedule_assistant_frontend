
import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import AuthLayout from "@/components/layout/AuthLayout";
import SignIn from "@/components/auth/SignIn";
import SignUp from "@/components/auth/SignUp";
import { useAuth } from "@/context/AuthContext";

const Auth: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <AuthLayout>
        <div className="glass-card flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AuthLayout>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="*" element={<Navigate to="/auth/signin" replace />} />
      </Routes>
    </AuthLayout>
  );
};

export default Auth;
