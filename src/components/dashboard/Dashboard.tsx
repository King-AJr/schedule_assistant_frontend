import React from "react";
import { motion } from "framer-motion";
import { fadeIn, slideUp, slideRight, staggerContainer } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import ConversationArea from "@/components/chat/ConversationArea";
import ScheduleView from "@/components/schedule/ScheduleView";
import GlassCard from "@/components/ui/GlassCard";
import { LogOut, User, BellRing, Menu, X, Moon, Settings, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Set the dark mode button label based on the current theme.
  const darkModeLabel = theme === "dark" ? "Light Mode" : "Dark Mode";

  return (
    <div className="min-h-screen bg-background text-foreground w-full overflow-auto smooth-gradient">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/3 right-1/3 w-1/3 h-1/3 bg-primary/10 blur-[100px] rounded-full" />
      </div>
      
      {/* Mobile menu */}
      <div className="md:hidden fixed top-0 left-0 w-full z-50">
        <div className="p-4 flex justify-between items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-foreground"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground"
            >
              <BellRing className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="glass border-b border-white/10"
          >
            <div className="p-4 space-y-3">
              <Button variant="ghost" className="w-full justify-start text-foreground">
                <LayoutGrid className="w-4 h-4 mr-2" /> Dashboard
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-foreground"
                onClick={toggleTheme}
              >
                <Moon className="w-4 h-4 mr-2" /> {darkModeLabel}
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-foreground"
                onClick={() => navigate("/settings")}
              >
                <Settings className="w-4 h-4 mr-2" /> Settings
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-destructive" 
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </Button>
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Desktop sidebar */}
      <div className="hidden md:flex fixed top-0 left-0 h-full w-60 glass border-r border-white/10 flex-col p-6 z-50">
        <motion.div 
          className="flex items-center gap-3 mb-8"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
        >
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground">
            A
          </div>
          <div className="font-medium">AI Schedule Assistant</div>
        </motion.div>
        
        <motion.div 
          className="flex-1 space-y-1"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={slideRight}>
            <Button variant="ghost" className="w-full justify-start mb-1">
              <LayoutGrid className="w-4 h-4 mr-2" /> Dashboard
            </Button>
          </motion.div>
          
          <motion.div variants={slideRight}>
            <Button 
              variant="ghost" 
              className="w-full justify-start mb-1"
              onClick={toggleTheme}
            >
              <Moon className="w-4 h-4 mr-2" /> {darkModeLabel}
            </Button>
          </motion.div>
          
          <motion.div variants={slideRight}>
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => navigate("/settings")}
            >
              <Settings className="w-4 h-4 mr-2" /> Settings
            </Button>
          </motion.div>
        </motion.div>
        
        <motion.div 
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="mt-auto"
        >
          <GlassCard className="mb-4 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="font-medium text-sm">{user?.name}</div>
                <div className="text-xs text-muted-foreground">{user?.email}</div>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-xs justify-start mt-2" 
              onClick={handleLogout}
            >
              <LogOut className="w-3 h-3 mr-1" /> Logout
            </Button>
          </GlassCard>
        </motion.div>
      </div>
      
      {/* Main content */}
      <div className="pt-16 md:pt-6 md:pl-64 p-4 md:p-6 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="flex justify-between items-center mb-6 md:mb-8"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
          >
            <div>
              <h1 className="text-2xl font-medium">Welcome, {user?.name}</h1>
              <p className="text-muted-foreground">
                How can I assist you with your schedule today?
              </p>
            </div>
            
            <div className="hidden md:flex items-center gap-3">
              <Button variant="outline" size="icon">
                <BellRing className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-[calc(100vh-12rem)] lg:auto-rows-[initial] lg:h-[calc(100vh-12rem)]">
            <motion.div 
              variants={slideUp}
              initial="hidden"
              animate="visible"
              className="h-full overflow-hidden w-full"
            >
              <ConversationArea />
            </motion.div>
            
            <motion.div 
              variants={slideUp}
              initial="hidden"
              animate="visible"
              className="h-full w-full"
            >
              <ScheduleView />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
