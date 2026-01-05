import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./Button";
import { FaExclamationTriangle } from "react-icons/fa";

/**
 * Reusable Confirmation Dialog Component
 * Better than Modal for confirmations with proper button states
 */
export const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  title, 
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  isDangerous = false,
  isLoading = false
}) => {
  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose} 
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl z-10"
        >
          {isDangerous && (
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                <FaExclamationTriangle size={20} />
              </div>
            </div>
          )}

          <h3 className="font-bold text-lg text-center text-slate-900 mb-2">{title}</h3>
          {message && (
            <p className="text-slate-600 text-sm text-center mb-6">{message}</p>
          )}

          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              onClick={onClose} 
              disabled={isLoading}
              className="flex-1"
            >
              {cancelLabel}
            </Button>
            <Button 
              variant={isDangerous ? "danger" : "primary"}
              onClick={onConfirm} 
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : confirmLabel}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
