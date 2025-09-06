import * as React from "react"
import { cn } from "@/shared/utils"
import { CheckCircle2, Circle } from "lucide-react"
import { LoadingSpinner } from "./loading-spinner"

export interface ProgressStep {
  id: string
  label: string
  description?: string
}

export interface ProgressIndicatorProps {
  steps: ProgressStep[]
  currentStepId: string
  completedStepIds: string[]
  className?: string
  variant?: "horizontal" | "vertical"
}

export function ProgressIndicator({
  steps,
  currentStepId,
  completedStepIds,
  className,
  variant = "vertical"
}: ProgressIndicatorProps) {
  const isHorizontal = variant === "horizontal"

  return (
    <div className={cn(
      "flex",
      isHorizontal ? "flex-row items-center space-x-4" : "flex-col space-y-4",
      className
    )}>
      {steps.map((step, index) => {
        const isCompleted = completedStepIds.includes(step.id)
        const isCurrent = step.id === currentStepId
        const isUpcoming = !isCompleted && !isCurrent

        return (
          <div
            key={step.id}
            className={cn(
              "flex items-center",
              isHorizontal ? "flex-col text-center" : "flex-row space-x-3"
            )}
          >
            {/* Step Icon */}
            <div className={cn(
              "flex-shrink-0 flex items-center justify-center",
              isHorizontal ? "mb-2" : ""
            )}>
              {isCompleted ? (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              ) : isCurrent ? (
                <div className="relative">
                  <Circle className="w-6 h-6 text-blue-500" />
                  <LoadingSpinner 
                    size="sm" 
                    className="absolute inset-0 m-auto text-blue-500" 
                  />
                </div>
              ) : (
                <Circle className="w-6 h-6 text-gray-400" />
              )}
            </div>

            {/* Step Content */}
            <div className={cn(
              "flex-1",
              isHorizontal ? "text-center" : ""
            )}>
              <p className={cn(
                "text-sm font-medium",
                isCompleted ? "text-green-700 dark:text-green-400" : 
                isCurrent ? "text-blue-700 dark:text-blue-400" : 
                "text-gray-500 dark:text-gray-400"
              )}>
                {step.label}
              </p>
              {step.description && (
                <p className={cn(
                  "text-xs mt-1",
                  isCompleted ? "text-green-600 dark:text-green-500" : 
                  isCurrent ? "text-blue-600 dark:text-blue-500" : 
                  "text-gray-400 dark:text-gray-500"
                )}>
                  {step.description}
                </p>
              )}
            </div>

            {/* Connector Line (for horizontal layout) */}
            {isHorizontal && index < steps.length - 1 && (
              <div className={cn(
                "h-px w-8 mx-2",
                isCompleted ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}