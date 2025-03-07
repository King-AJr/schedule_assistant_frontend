import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { staggerContainer, fadeIn } from "@/lib/animations";
import { useAuth } from "@/context/AuthContext";
import GlassCard from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const SignIn: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Sign in error:", err);
      const errorMessage = err?.message || "Invalid credentials. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <GlassCard className="w-full">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={fadeIn} className="text-center space-y-2">
          <h1 className="text-2xl font-medium">Welcome Back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to continue to your AI Schedule Assistant
          </p>
        </motion.div>

        {error && (
          <motion.div 
            variants={fadeIn}
            className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}

        <motion.form variants={fadeIn} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="bg-secondary/50"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-secondary/50"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </motion.form>

        <motion.div variants={fadeIn} className="text-center text-sm">
          <p className="text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/auth/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </GlassCard>
  );
};

export default SignIn;
