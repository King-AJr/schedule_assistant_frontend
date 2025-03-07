
import React from "react";
import { motion } from "framer-motion";
import { fadeIn } from "@/lib/animations";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-6 smooth-gradient">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/3 right-1/3 w-1/3 h-1/3 bg-primary/10 blur-[100px] rounded-full" />
      </div>
      
      <motion.div 
        className="w-full max-w-md z-10"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={fadeIn}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default AuthLayout;
