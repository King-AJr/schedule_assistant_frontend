
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { fadeIn, slideUp, staggerContainer } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import GlassCard from "@/components/ui/GlassCard";
import { 
  ArrowLeft, 
  Bell, 
  Moon,
  Sun,
  User, 
  Lock, 
  Globe, 
  Info,
  Trash2, 
  Save
} from "lucide-react";

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  
  // User settings state
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState("English");
  
  // Section display state
  const [activeSection, setActiveSection] = useState("account");
  
  const handleSaveSettings = () => {
    // In a real app, this would save to backend
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated."
    });
  };
  
  const sectionItems = [
    { id: "account", icon: <User className="w-5 h-5" />, label: "Account" },
    { id: "appearance", icon: theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />, label: "Appearance" },
    { id: "notifications", icon: <Bell className="w-5 h-5" />, label: "Notifications" },
    { id: "privacy", icon: <Lock className="w-5 h-5" />, label: "Privacy & Security" },
    { id: "language", icon: <Globe className="w-5 h-5" />, label: "Language & Region" },
    { id: "about", icon: <Info className="w-5 h-5" />, label: "About" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground w-full overflow-hidden smooth-gradient">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/3 right-1/3 w-1/3 h-1/3 bg-primary/10 blur-[100px] rounded-full" />
      </div>
      
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-center mb-8">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/dashboard")} 
            className="mr-4"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-medium">Settings</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Settings sidebar */}
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="md:col-span-1"
          >
            <GlassCard className="overflow-hidden p-0">
              <div className="p-4 border-b border-white/10">
                <div className="font-medium">Settings</div>
              </div>
              
              <div className="p-2">
                {sectionItems.map((item) => (
                  <Button
                    key={item.id}
                    variant={activeSection === item.id ? "secondary" : "ghost"}
                    className="w-full justify-start mb-1 p-3"
                    onClick={() => setActiveSection(item.id)}
                  >
                    {item.icon} 
                    <span className="ml-3">{item.label}</span>
                  </Button>
                ))}
              </div>
            </GlassCard>
          </motion.div>
          
          {/* Settings content */}
          <motion.div
            variants={slideUp}
            initial="hidden"
            animate="visible"
            className="md:col-span-3"
          >
            <GlassCard>
              {activeSection === "account" && (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="space-y-6"
                >
                  <h2 className="text-xl font-medium mb-4">Account Settings</h2>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm text-muted-foreground">Name</label>
                      <Input 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        placeholder="Your name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm text-muted-foreground">Email</label>
                      <Input 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        placeholder="Your email"
                        type="email"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-white/10">
                    <Button 
                      variant="destructive" 
                      className="flex items-center"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                    </Button>
                  </div>
                </motion.div>
              )}
              
              {activeSection === "appearance" && (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="space-y-6"
                >
                  <h2 className="text-xl font-medium mb-4">Appearance</h2>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Dark Mode</div>
                      <div className="text-sm text-muted-foreground">
                        {theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                      </div>
                    </div>
                    <Switch 
                      checked={theme === "dark"} 
                      onCheckedChange={toggleTheme} 
                    />
                  </div>
                </motion.div>
              )}
              
              {activeSection === "notifications" && (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="space-y-6"
                >
                  <h2 className="text-xl font-medium mb-4">Notifications</h2>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Enable Notifications</div>
                      <div className="text-sm text-muted-foreground">Receive reminders and updates</div>
                    </div>
                    <Switch 
                      checked={notifications} 
                      onCheckedChange={setNotifications} 
                    />
                  </div>
                </motion.div>
              )}
              
              {activeSection === "privacy" && (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="space-y-6"
                >
                  <h2 className="text-xl font-medium mb-4">Privacy & Security</h2>
                  
                  <div className="space-y-4">
                    <Button variant="outline">Change Password</Button>
                    <div className="pt-4 border-t border-white/10">
                      <div className="text-sm text-muted-foreground mb-2">
                        Your data is encrypted and securely stored. We never share your information with third parties.
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {activeSection === "language" && (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="space-y-6"
                >
                  <h2 className="text-xl font-medium mb-4">Language & Region</h2>
                  
                  <div className="space-y-2">
                    <label className="block text-sm text-muted-foreground">Language</label>
                    <select 
                      className="w-full bg-background border border-input px-3 py-2 rounded-md"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                      <option value="Japanese">Japanese</option>
                    </select>
                  </div>
                </motion.div>
              )}
              
              {activeSection === "about" && (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="space-y-6"
                >
                  <h2 className="text-xl font-medium mb-4">About</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium">AI Schedule Assistant</h3>
                      <div className="text-sm text-muted-foreground">Version 1.0.0</div>
                    </div>
                    
                    <div className="pt-4 border-t border-white/10">
                      <div className="text-sm text-muted-foreground">
                        © 2025 AI Schedule Assistant. All rights reserved.
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {activeSection !== "about" && (
                <div className="flex justify-end mt-6 pt-4 border-t border-white/10">
                  <Button onClick={handleSaveSettings}>
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                  </Button>
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
