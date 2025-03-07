import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "@/lib/animations";
import GlassCard from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  CalendarCheck,
  Tag,
  AlertCircle,
  BarChart4,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, startOfToday, endOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

// API endpoint for schedule events
const API_URL = "http://127.0.0.1:8000"; // Replace with your actual API URL

interface ScheduleItem {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  attendees: number;
  priority: string;
  type: "meeting" | "personal" | "deadline" | "appointment";
}

interface ScheduleItemProps {
  item: ScheduleItem;
}

const ScheduleItem: React.FC<ScheduleItemProps> = ({ item }) => {
  const priorityClasses = {
    low: "bg-blue-500/20 text-blue-400",
    medium: "bg-orange-500/20 text-orange-400",
    high: "bg-red-500/20 text-red-400",
  };

  const typeIcons = {
    meeting: <Users className="w-4 h-4" />,
    personal: <Calendar className="w-4 h-4" />,
    deadline: <AlertCircle className="w-4 h-4" />,
    appointment: <CalendarCheck className="w-4 h-4" />,
  };

  return (
    <motion.div 
      variants={fadeIn}
      className="p-4 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-medium text-base">{item.title}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{item.time}</span>
          </div>
        </div>
        <div className={cn(
          "px-2 py-1 text-xs rounded-full font-medium",
          priorityClasses[item.priority as keyof typeof priorityClasses]
        )}>
          {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-3 mt-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-full">
          <Calendar className="w-3 h-3" />
          <span>{item.date}</span>
        </div>
        
        {item.location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-full">
            <MapPin className="w-3 h-3" />
            <span>{item.location}</span>
          </div>
        )}
        
        {item.attendees > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-full">
            <Users className="w-3 h-3" />
            <span>{item.attendees} attendee{item.attendees !== 1 ? 's' : ''}</span>
          </div>
        )}
        
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-full">
          <Tag className="w-3 h-3" />
          <span>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</span>
        </div>
      </div>
    </motion.div>
  );
};

const ScheduleView: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month">("day");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [totalEvents, setTotalEvents] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Fetch schedule data based on time range and selected date
  const fetchScheduleData = async () => {
    const token = localStorage.getItem("authToken");
    setIsLoading(true);
    
    try {
      // Set date range based on selected time range
      let startDate, endDate;
      
      if (timeRange === "day") {
        // Set start date to beginning of selected date (00:00:00)
        startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);
        
        // Set end date to end of selected date (23:59:59)
        endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);
      } else if (timeRange === "week") {
        startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
        endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
      } else {
        startDate = startOfMonth(selectedDate);
        endDate = endOfMonth(selectedDate);
      }
      
      // Format dates for API call
      const formattedStartDate = format(startDate, "yyyy-MM-dd");
      const formattedEndDate = format(endDate, "yyyy-MM-dd");
      const user_id = user?.id
      
      // Make the API call
      try {
        const response = await fetch(`${API_URL}/api/schedule`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            query: `Get events for ${formattedStartDate} to ${formattedEndDate}`,
            user_id: user_id
          })
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch schedule data");
        }
        
        const data = await response.json();
        // Transform API data to match ScheduleItem interface with default values
        const transformedEvents = data.events.map((event: any, index: number) => {
          return {
            id: String(index + 1),
            title: event.title || "Untitled Event",
            date: format(event.date, "MMM d, yyyy"), // Use selected date for display
            time: event.time || "No time specified",
            location: event.venue || "No location specified",
            attendees: event.attendees || 0,
            priority: event.priority || "medium",
            type: (event.tag?.toLowerCase() || "personal") as "meeting" | "personal" | "deadline" | "appointment"
          };
        });
        
        setScheduleItems(transformedEvents);
        setTotalEvents(transformedEvents.length);
        
      } catch (error) {
        console.error("API call failed:", error);
        
        // Mock implementation for development/demo
        console.log("Using mock schedule data");
        
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Ensure mock data matches the ScheduleItem interface
        const mockScheduleItems: ScheduleItem[] = [
          {
            id: "1",
            title: "Team Meeting",
            date: "Today",
            time: "10:00 AM - 11:30 AM",
            location: "Conference Room B",
            attendees: 5,
            priority: "medium",
            type: "meeting",
          },
          {
            id: "2",
            title: "Lunch with Alex",
            date: "Today",
            time: "12:30 PM - 1:30 PM",
            location: "Bistro Garden",
            attendees: 2,
            priority: "low",
            type: "personal",
          },
          {
            id: "3",
            title: "Project Deadline",
            date: "Tomorrow",
            time: "5:00 PM",
            location: "",
            attendees: 0,
            priority: "high",
            type: "deadline",
          },
          {
            id: "4",
            title: "Dental Appointment",
            date: timeRange === "month" ? "Aug 15" : "Next week",
            time: "2:00 PM",
            location: "City Dental Clinic",
            attendees: 1,
            priority: "medium",
            type: "appointment",
          },
        ];
        
        setScheduleItems(mockScheduleItems);
        setTotalEvents(12); // Mock total events count
      }
      
    } catch (error) {
      console.error("Error fetching schedule:", error);
      toast.error("Failed to load schedule data. Please try again.");
      setScheduleItems([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch data when component mounts or time range/selected date changes
  useEffect(() => {
    fetchScheduleData();
  }, [timeRange, selectedDate]);
  
  // Handle time range selection
  const handleTimeRangeChange = (range: "day" | "week" | "month") => {
    setTimeRange(range);
  };
  
  // Handle date selection from calendar
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setCalendarOpen(false);
    }
  };
  
  const getDateRangeDisplay = () => {
    if (timeRange === "day") {
      return format(selectedDate, "MMMM d, yyyy");
    } else if (timeRange === "week") {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    } else {
      return format(selectedDate, "MMMM yyyy");
    }
  };

  return (
    <GlassCard className="flex flex-col h-full">
      <div className="flex justify-between items-center pb-4 border-b border-white/10">
        <motion.h2 
          className="text-lg font-medium"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
        >
          Upcoming Schedule
        </motion.h2>
        
        <motion.div 
          className="flex gap-2"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
        >
          <Button
            variant={timeRange === "day" ? "default" : "ghost"}
            size="sm"
            className={timeRange === "day" ? "" : "hover:bg-white/5"}
            onClick={() => handleTimeRangeChange("day")}
          >
            Today
          </Button>
          <Button
            variant={timeRange === "week" ? "default" : "ghost"}
            size="sm"
            className={timeRange === "week" ? "" : "hover:bg-white/5"}
            onClick={() => handleTimeRangeChange("week")}
          >
            Week
          </Button>
          <Button
            variant={timeRange === "month" ? "default" : "ghost"}
            size="sm"
            className={timeRange === "month" ? "" : "hover:bg-white/5"}
            onClick={() => handleTimeRangeChange("month")}
          >
            Month
          </Button>
        </motion.div>
      </div>
      
      <motion.div className="pt-3 pb-1 flex justify-between items-center">
        <div className="text-sm font-medium">{getDateRangeDisplay()}</div>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-1 text-xs">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>Select Date</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </motion.div>
      
      <motion.div 
        className="flex-1 overflow-y-auto py-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : scheduleItems.length > 0 ? (
          scheduleItems.map((item) => (
            <ScheduleItem key={item.id} item={item} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <CalendarCheck className="w-12 h-12 mb-2 opacity-50" />
            <p>No events scheduled for this period</p>
          </div>
        )}
      </motion.div>
      
      <motion.div 
        className="mt-4 flex justify-between items-center border-t border-white/10 pt-4"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        <div className="text-sm">
          <span className="text-muted-foreground">Showing</span> {scheduleItems.length} 
          <span className="text-muted-foreground"> of</span> {totalEvents} 
          <span className="text-muted-foreground"> events</span>
        </div>
      </motion.div>
    </GlassCard>
  );
};

export default ScheduleView;
