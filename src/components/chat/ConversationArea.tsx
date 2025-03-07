import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { fadeIn, slideUp } from "@/lib/animations";
import GlassCard from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Mic, MicOff, User2, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import logger from '@/lib/logger';

// Add TypeScript declarations for SpeechRecognition 
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  error: any;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: (event: SpeechRecognitionEvent) => void;
  onstart: () => void;
  onend: () => void;
  onerror: (event: any) => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

// API endpoint for chat messages
const API_URL = import.meta.env.VITE_API_URL;// Replace with your actual API URL

const ConversationArea: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Reference to the chat container for auto-scrolling
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Speech synthesis setup
  const synth = window.speechSynthesis;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Speech recognition setup
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Ref to track listening state in callbacks
  const isListeningRef = useRef<boolean>(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch previous messages on component mount
  useEffect(() => {
    const fetchPreviousMessages = async () => {
      if (!isAuthenticated || !user?.id) {
        setMessages([{
          id: "1",
          content: "Hello! I'm your AI Schedule Assistant. You can tell me about your upcoming events or ask about your schedule.",
          sender: "assistant",
          timestamp: new Date(),
        }]);
        return;
      }

      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(`${API_URL}/api/chat/history/${user.id}`, {
          headers: {
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          }
        });

        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }

        const data = await response.json();
        
        // Filter out "Get events for" messages before formatting
        const filteredData = data.filter((item: any) => 
          !item.message.startsWith('Get events for')
        );

        const formattedMessages: Message[] = filteredData.flatMap((item: any, index: number) => [
          {
            id: `${index}-user`,
            content: item.message,
            sender: "user",
            timestamp: new Date(item.timestamp)
          },
          {
            id: `${index}-assistant`,
            content: item.response,
            sender: "assistant",
            timestamp: new Date(item.timestamp)
          }
        ]);

        if (formattedMessages.length === 0) {
          setMessages([{
            id: "1",
            content: "Hello! I'm your AI Schedule Assistant. You can tell me about your upcoming events or ask about your schedule.",
            sender: "assistant",
            timestamp: new Date(),
          }]);
        } else {
          setMessages(formattedMessages);
        }
      } catch (error) {
        logger.error("Failed to fetch messages:", { error });
        toast.error("Failed to load previous messages");
        setMessages([{
          id: "1",
          content: "Hello! I'm your AI Schedule Assistant. You can tell me about your upcoming events or ask about your schedule.",
          sender: "assistant",
          timestamp: new Date(),
        }]);
      }
    };

    fetchPreviousMessages();
  }, [isAuthenticated, user?.id]);

  // Initialize speech recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript;
        
        if (isListeningRef.current) {
          if (!lastResult.isFinal) {
            setInput(transcript);
          } else {
            if (transcript.trim()) {
              handleSendMessage(undefined, transcript.trim());
              setInput('');
            }
          }
        }
      };
  
      recognitionRef.current.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        toast.success('Listening... Speak now');
      };
  
      recognitionRef.current.onerror = (event) => {
        logger.error('Speech recognition error:', { error: event.error });
        isListeningRef.current = false;
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please check your browser settings.');
        } else {
          toast.error('Speech recognition failed. Please try again.');
        }
      };
  
      recognitionRef.current.onend = () => {
        isListeningRef.current = false;
        setIsListening(false);
      };
    } else {
      toast.error('Speech recognition is not supported in your browser');
    }
  
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Clean up speech synthesis when component unmounts
  useEffect(() => {
    return () => {
      if (utteranceRef.current && synth.speaking) {
        synth.cancel();
      }
    };
  }, [synth]);

  const toggleMicrophone = async () => {
    try {
      if (!isListeningRef.current) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setInput('');
        isListeningRef.current = true;
        setIsListening(true);
        recognitionRef.current?.start();
      } else {
        recognitionRef.current?.stop();
        isListeningRef.current = false;
        setIsListening(false);
        setInput('');
      }
    } catch (error) {
      logger.error('Microphone access error:', { error });
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, transcriptText?: string) => {
    if (e) {
      e.preventDefault();
    }

    // Use transcriptText if provided (from speech), otherwise use input state
    const messageContent = transcriptText || input;
    
    if (!messageContent.trim()) return;

    // Stop any ongoing speech
    if (utteranceRef.current && synth.speaking) {
      synth.cancel();
      setIsSpeaking(false);
    }

    // Stop listening if active
    if (isListeningRef.current && recognitionRef.current) {
      recognitionRef.current.stop();
      isListeningRef.current = false;
      setIsListening(false);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const token = localStorage.getItem("authToken");

      try {
        console.log(userMessage.content);
        const response = await fetch(`${API_URL}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            content: userMessage.content
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get response from server");
        }

        const data = await response.json();
        console.log(data);
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.message,
          sender: "assistant",
          timestamp: new Date(),
        };
        
        setMessages((prev) => [...prev, assistantMessage]);
        speakText(data.message);
        
      } catch (error) {
        logger.error('API call failed:', { error });
        
        // Mock implementation for development/demo
        setTimeout(() => {
          const mockResponse = "I've noted that information about your schedule. Is there anything else you'd like to add or ask about?";
          
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: mockResponse,
            sender: "assistant",
            timestamp: new Date(),
          };
          
          setMessages((prev) => [...prev, assistantMessage]);
          speakText(mockResponse);
        }, 1500);
      }
    } catch (error) {
      logger.error('Error sending message:', { error });
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      if (synth.speaking) {
        synth.cancel();
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      const voices = synth.getVoices();
      const englishVoice = voices.find(voice => voice.lang.includes('en-'));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => {
        setIsSpeaking(false);
        toast.error("Text-to-speech failed");
      };
      
      synth.speak(utterance);
    } else {
      toast.error("Text-to-speech is not supported in your browser");
    }
  };

  const toggleSpeech = (messageText: string) => {
    if (isSpeaking && utteranceRef.current) {
      synth.cancel();
      setIsSpeaking(false);
    } else {
      speakText(messageText);
    }
  };

  return (
    <GlassCard className="flex flex-col h-full">
      <motion.div 
        className="text-lg font-medium pb-4 border-b border-white/10"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        Conversation
      </motion.div>
      
      <motion.div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        {messages.map((message) => (
          <motion.div
            key={message.id}
            className={`flex items-start gap-3 ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
            variants={slideUp}
            initial="hidden"
            animate="visible"
          >
            {message.sender === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <User2 className="w-4 h-4 text-primary" />
              </div>
            )}
            
            <div
              className={`px-4 py-3 rounded-2xl max-w-[80%] ${
                message.sender === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs opacity-70">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                
                {message.sender === "assistant" && (
                  <Button 
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full p-0 opacity-70 hover:opacity-100"
                    onClick={() => toggleSpeech(message.content)}
                    title={isSpeaking ? "Stop speaking" : "Read aloud"}
                  >
                    {isSpeaking ? 
                      <VolumeX className="w-3 h-3" /> : 
                      <Volume2 className="w-3 h-3" />
                    }
                  </Button>
                )}
              </div>
            </div>
            
            {message.sender === "user" && (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <User2 className="w-4 h-4 text-primary" />
              </div>
            )}
          </motion.div>
        ))}
        
        {isTyping && (
          <div className="flex items-start gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <User2 className="w-4 h-4 text-primary" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-secondary text-secondary-foreground">
              <div className="flex space-x-1">
                <span className="w-2 h-2 bg-white/50 rounded-full animate-pulse"></span>
                <span className="w-2 h-2 bg-white/50 rounded-full animate-pulse delay-75"></span>
                <span className="w-2 h-2 bg-white/50 rounded-full animate-pulse delay-150"></span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
      
      <motion.form 
        onSubmit={handleSendMessage}
        className="mt-4 flex gap-2"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        <Button 
          type="button" 
          variant="outline" 
          size="icon"
          className={`rounded-full ${isListening ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-primary hover:bg-secondary/70'}`}
          onClick={toggleMicrophone}
          title={isListening ? "Stop listening" : "Voice input"}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? "Listening..." : "Type your message..."}
          className="flex-1 bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
        />
        <Button 
          type="submit" 
          variant="default" 
          size="icon"
          className="rounded-full"
          disabled={!input.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </motion.form>
    </GlassCard>
  );
};

export default ConversationArea;
