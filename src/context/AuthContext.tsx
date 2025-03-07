import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";

type User = {
  id: string;
  name: string;
  email: string;
} | null;


interface AuthContextType {
  user: User;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL; // Replace hardcoded URL

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for an existing session token
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (token) {
          setIsLoading(true);
          // Make API call to validate token
          const response = await fetch(`${API_URL}/auth/validate`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });

          if (response.ok) {
            const userData = await response.json();
            setUser(userData.user);
          } else {
            // Token invalid, clear storage
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

  
      if (response.status == 401) {
        toast.error("Invalid credentials");
        return;
      }
      console.log(response);
  
      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(errorData.message || "Login failed");
      }
  
      const data = await response.json();
  
      // Create a user object using returned fields
      const user = {
        id: data.user_id,
        name: data.display_name, // Example: derive name from email
        email: data.email,
      };
  
      // Store auth token and user data in localStorage
      localStorage.setItem("authToken", data.access_token);
      localStorage.setItem("user", JSON.stringify(user));
  
      setUser(user);
      toast.success("Successfully signed in!");
    } catch (error: any) {
      console.error("Login API call failed:", error);
  
      // Fallback mock implementation for demonstration
      // console.log("Using mock login implementation");
      // await new Promise((resolve) => setTimeout(resolve, 1000));
      // const mockUser = { id: "user-123", name: "User", email };
      // const mockToken = "mock-jwt-token-" + Date.now();
      // localStorage.setItem("authToken", mockToken);
      // localStorage.setItem("user", JSON.stringify(mockUser));
      // setUser(mockUser);
      toast.success("Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };
  

  const signup = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      // For now, simulate an API call with mock implementation
      // Replace with actual API call when backend is ready
      try {
        // This would be your actual API endpoint
        const response = await fetch(`${API_URL}/auth/signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ display_name: name, email, password }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Signup failed");
        }

        const data = await response.json();
        
        // Store auth token and user data
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);
        toast.success("Account created successfully!");
      } catch (error) {
        console.error("Signup API call failed:", error);
        
        // Mock implementation for demonstration
        // Remove this when real API is connected
        console.log("Using mock signup implementation");
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockUser = { id: "user-" + Date.now(), name, email };
        const mockToken = "mock-jwt-token-" + Date.now();
        localStorage.setItem("authToken", mockToken);
        localStorage.setItem("user", JSON.stringify(mockUser));
        setUser(mockUser);
        toast.success("Account created with mock implementation!");
      }
    } catch (error: any) {
      console.error("Signup failed:", error);
      toast.error(error.message || "Signup failed. Please try again.");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem("authToken");
      
      // Clear local storage and state immediately for better UX
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      setUser(null);
      
      // Make the API call after clearing local state
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
      }
      
      toast.info("You have been signed out");
    } catch (error) {
      console.error("Logout error:", error);
      // Even if the API call fails, the user is still logged out locally
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
