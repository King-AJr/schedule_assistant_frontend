
import React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  elevation?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  children: React.ReactNode;
}

const GlassCard = ({
  className,
  elevation = "md",
  hover = false,
  children,
  ...props
}: GlassCardProps) => {
  const { theme } = useTheme();
  
  const elevationClasses = {
    none: "",
    sm: theme === "dark" 
      ? "shadow-[0_4px_16px_rgba(0,0,0,0.08)]" 
      : "shadow-[0_4px_16px_rgba(0,0,0,0.04)]",
    md: theme === "dark" 
      ? "shadow-[0_8px_24px_rgba(0,0,0,0.12)]" 
      : "shadow-[0_8px_24px_rgba(0,0,0,0.06)]",
    lg: theme === "dark" 
      ? "shadow-[0_12px_32px_rgba(0,0,0,0.16)]" 
      : "shadow-[0_12px_32px_rgba(0,0,0,0.08)]",
  };

  const hoverClasses = theme === "dark"
    ? "hover:bg-white/8 hover:scale-[1.01] hover:shadow-[0_12px_32px_rgba(0,0,0,0.20)]"
    : "hover:bg-white/95 hover:scale-[1.01] hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)]";

  return (
    <div
      className={cn(
        "glass-card transition-all duration-300",
        elevationClasses[elevation],
        hover && hoverClasses,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
