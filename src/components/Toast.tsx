import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'

type ToastType = 'success' | 'error'
type Toast = { id: number; message: string; type: ToastType }

type ShowToast = (message: string, type?: ToastType) => void

const ToastContext = createContext<ShowToast>(() => {})

// Notificaciones breves (registro, inicio de sesión, errores). Ligero y sin
// dependencias: una pila de avisos que se autodescarta a los pocos segundos.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback<ShowToast>((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4"
        aria-live="polite"
        role="status"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto w-full max-w-sm rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1 ${
              t.type === 'error'
                ? 'bg-red-600 text-white ring-red-700/20'
                : 'bg-brand-600 text-white ring-brand-800/20'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext)
}
