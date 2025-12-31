/**
 * ToastProvider
 *
 * Context provider for toast notifications throughout the app.
 * Provides a simple `show()` API to display non-intrusive notifications.
 *
 * Usage:
 *   const { show } = useToast();
 *   show('Trip saved!', 'success');
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Toast, ToastType } from './Toast';
import { haptics } from '../../utils/haptics';

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

interface ToastContextValue {
  /**
   * Show a toast notification
   * @param message - The message to display
   * @param type - Type of notification (success, info, warning, error)
   */
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Toast notification provider
 * Wrap your app with this provider to enable toast notifications.
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'info',
    visible: false,
  });

  /**
   * Show a toast notification with optional haptic feedback
   */
  const show = useCallback((message: string, type: ToastType = 'info') => {
    // Trigger haptic feedback based on toast type
    switch (type) {
      case 'success':
        haptics.notification('success');
        break;
      case 'warning':
      case 'error':
        haptics.notification('warning');
        break;
      default:
        haptics.impact('light');
    }

    setToast({
      message,
      type,
      visible: true,
    });
  }, []);

  /**
   * Hide the current toast
   */
  const hide = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hide}
      />
    </ToastContext.Provider>
  );
}

/**
 * Hook to access toast notifications
 *
 * @example
 * const { show } = useToast();
 * show('Settings saved!', 'success');
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    // Return a no-op function if used outside provider (for safety)
    console.warn('useToast must be used within a ToastProvider');
    return {
      show: () => {},
    };
  }

  return context;
}

export default ToastProvider;
