import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ToastItem { id: number; message: string; type: 'success' | 'error' | 'info' }
interface ToastContextValue { toast: (message: string, type?: ToastItem['type']) => void }
const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const toast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = Date.now(); setItems((current) => [...current, { id, message, type }]); window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4500)
  }, [])
  const value = useMemo(() => ({ toast }), [toast])
  return <ToastContext.Provider value={value}>{children}<div className="fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-live="polite">{items.map((item) => <div key={item.id} className={cn('flex items-center gap-3 rounded-lg border bg-surface p-4 shadow-xl', item.type === 'error' ? 'border-red-300' : item.type === 'success' ? 'border-emerald-300' : 'border-border')}>{item.type === 'success' ? <CheckCircle2 className="text-emerald-600" /> : item.type === 'error' ? <CircleAlert className="text-red-600" /> : <Info className="text-primary" />}<p className="flex-1 text-sm text-foreground">{item.message}</p><button aria-label="Dismiss notification" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}><X size={16} /></button></div>)}</div></ToastContext.Provider>
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
