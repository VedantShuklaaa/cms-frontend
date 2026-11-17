"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (title: string, tone?: ToastTone, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneConfig: Record<
  ToastTone,
  { icon: IconName; iconClass: string; barClass: string }
> = {
  success: {
    icon: "checkCircle",
    iconClass: "text-emerald-600",
    barClass: "bg-emerald-500",
  },
  error: {
    icon: "alert",
    iconClass: "text-rose-600",
    barClass: "bg-rose-500",
  },
  info: {
    icon: "info",
    iconClass: "text-sky-600",
    barClass: "bg-sky-500",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (title: string, tone: ToastTone = "success", description?: string) => {
      const id = ++idRef.current;
      setItems((current) => [...current, { id, title, tone, description }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-20 z-[70] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
        aria-live="polite"
      >
        {items.map((item) => {
          const config = toneConfig[item.tone];
          return (
            <div
              key={item.id}
              className="animate-toast-in pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-900/10"
            >
              <span
                className={cn(
                  "absolute inset-y-0 left-0 w-1",
                  config.barClass,
                )}
              />
              <Icon
                name={config.icon}
                size={18}
                className={cn("mt-0.5 shrink-0", config.iconClass)}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">
                  {item.title}
                </p>
                {item.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    {item.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="-mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Dismiss notification"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider");
  }
  return context;
}
