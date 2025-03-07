import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeIn, slideUp, staggerContainer } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/ui/GlassCard";
import { Calendar, Brain, Clock, Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const Index = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const features = [
    {
      icon: <Brain className="w-5 h-5 text-primary" />,
      title: "AI-Powered Memory",
      description: "The assistant remembers your schedule details mentioned in casual conversation.",
    },
    {
      icon: <Calendar className="w-5 h-5 text-primary" />,
      title: "Smart Scheduling",
      description: "Organize your events, tasks, and reminders without manual input.",
    },
    {
      icon: <Clock className="w-5 h-5 text-primary" />,
      title: "Context-Aware Responses",
      description: "Get accurate information based on your past conversations.",
    },
    {
      icon: <Sparkles className="w-5 h-5 text-primary" />,
      title: "Natural Interaction",
      description: "Communicate with your assistant as you would with a person.",
    },
  ];

  return (
    <div className="min-h-screen w-full overflow-x-hidden smooth-gradient">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/3 right-1/3 w-1/3 h-1/3 bg-primary/10 blur-[100px] rounded-full" />
      </div>

      <div className="flex flex-col min-h-screen max-w-7xl mx-auto px-4 py-8 md:px-6 md:py-12 relative z-10">
        <motion.header 
          className="flex justify-between items-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground">
              A
            </div>
            <span className="font-medium">AI Schedule Assistant</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/auth/signin")}
            >
              Sign In
            </Button>
            <Button onClick={() => navigate("/auth/signup")}>
              Get Started
            </Button>
          </div>
        </motion.header>

        <motion.section 
          className="flex-1 flex flex-col md:flex-row items-center gap-8 md:gap-16 my-8 md:my-16"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div 
            className="flex-1 space-y-6 text-center md:text-left"
            variants={fadeIn}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Your AI-Powered <span className="text-gradient">Schedule Memory</span> Assistant
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-lg">
              Effortlessly remember your schedule by simply mentioning events in conversation. No more manual entry.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 justify-center md:justify-start">
              <Button 
                size="lg" 
                className="min-w-[160px]"
                onClick={() => navigate("/auth/signup")}
              >
                Get Started <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="min-w-[160px]"
                onClick={() => navigate("/auth/signin")}
              >
                Sign In
              </Button>
            </div>
          </motion.div>
          
          <motion.div 
            className="flex-1 max-w-md"
            variants={slideUp}
          >
            <GlassCard className="overflow-hidden aspect-square relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-6xl font-bold text-primary/20">UI</div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 glass-card m-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm mb-1">I'll remember your meeting with John tomorrow at 10 AM. Would you like a reminder?</p>
                    <div className="flex gap-2 mt-3">
                      <div className="text-xs bg-white/10 px-3 py-1.5 rounded-full">Yes, please</div>
                      <div className="text-xs bg-white/10 px-3 py-1.5 rounded-full">No, thanks</div>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </motion.section>

        <motion.section 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-16"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {features.map((feature, index) => (
            <motion.div 
              key={index} 
              variants={fadeIn}
              className="glass-card flex flex-col items-center text-center p-6"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </motion.section>

        <motion.footer 
          className="mt-auto pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
        >
          <div className="text-sm text-muted-foreground">
            © 2023 AI Schedule Assistant. All rights reserved.
          </div>
          
          <div className="flex gap-4 text-sm">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
        </motion.footer>
      </div>
    </div>
  );
};

export default Index;
