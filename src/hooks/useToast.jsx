import { useState, useCallback, useRef } from 'react';

export default function useToast() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const toast = useCallback((message) => addToast(message, 'info'), [addToast]);
  toast.success = useCallback((message) => addToast(message, 'success'), [addToast]);
  toast.error = useCallback((message) => addToast(message, 'error'), [addToast]);

  const ToastContainer = () => (
    <>
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.message}
        </div>
      ))}
    </>
  );

  return { toast, ToastContainer };
}
