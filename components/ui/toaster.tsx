import { useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { announcePolite, announceAssertive } from "@/utils/announcer"

export function Toaster() {
  const { toasts } = useToast()

  // Announce toast messages to screen readers
  useEffect(() => {
    toasts.forEach((toast) => {
      const message = `${toast.title || ''}${toast.title && toast.description ? ': ' : ''}${typeof toast.description === 'string' ? toast.description : ''}`
      
      if (toast.variant === 'destructive') {
        announceAssertive(message)
      } else {
        announcePolite(message)
      }
    })
  }, [toasts])

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} role="status" aria-live="polite" aria-atomic="true">
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose aria-label="Close notification" />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
