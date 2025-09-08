import { cn } from "@/shared/utils"
import { Loader2, RefreshCw } from "lucide-react"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  variant?: "loader" | "refresh"
  className?: string
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6", 
  lg: "w-8 h-8"
}

export function LoadingSpinner({ 
  size = "md", 
  variant = "loader", 
  className 
}: LoadingSpinnerProps) {
  const Icon = variant === "refresh" ? RefreshCw : Loader2
  
  return (
    <Icon 
      className={cn(
        "animate-spin",
        sizeClasses[size],
        className
      )} 
    />
  )
}