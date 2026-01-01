import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes } from "react-icons/fa";

export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return createPortal(
    <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl z-10">
            <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-lg">{title}</h3>
               <button onClick={onClose}><FaTimes className="text-slate-400 hover:text-slate-900" /></button>
            </div>
            {children}
          </motion.div>
        </div>
    </AnimatePresence>,
    document.body
  );
};