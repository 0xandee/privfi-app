import * as React from "react"
import { motion } from "framer-motion"
import { Button, ButtonProps } from "./button"
import { LoadingSpinner } from "./loading-spinner"
import { cn } from "@/shared/utils"
import { useAnimations } from "@/shared/hooks/useAnimations"

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
    const { transitions } = useAnimations();
    const isDisabled = loading || disabled

    return (
      <motion.div
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        animate={{ opacity: isDisabled ? 0.5 : 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <Button
          ref={ref}
          disabled={isDisabled}
          className={cn(className, transitions.default)}
          {...props}
        >
          <motion.div
            className="flex items-center justify-center"
            initial={false}
            animate={{ opacity: 1 }}
          >
            {loading && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <LoadingSpinner 
                  size="sm" 
                  variant={spinnerVariant}
                  className="mr-2" 
                />
              </motion.div>
            )}
            {loading && loadingText ? loadingText : children}
          </motion.div>
        </Button>
      </motion.div>
    )
  }
)

LoadingButton.displayName = "LoadingButton"

export { LoadingButton }