import * as React from "react"
import { Button, ButtonProps } from "./button"
import { LoadingSpinner } from "./loading-spinner"
import { cn } from "@/shared/utils"

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean
  loadingText?: string
  spinnerVariant?: "loader" | "refresh"
}

const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ 
    children, 
    loading = false, 
    loadingText, 
    spinnerVariant = "loader",
    disabled,
    className,
    ...props 
  }, ref) => {
    const isDisabled = loading || disabled

    return (
      <Button
        ref={ref}
        disabled={isDisabled}
        className={cn(className)}
        {...props}
      >
        {loading && (
          <LoadingSpinner 
            size="sm" 
            variant={spinnerVariant}
            className="mr-2" 
          />
        )}
        {loading && loadingText ? loadingText : children}
      </Button>
    )
  }
)

LoadingButton.displayName = "LoadingButton"

export { LoadingButton }