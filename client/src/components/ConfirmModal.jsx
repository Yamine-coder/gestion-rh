import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle, Info, LogOut, X } from "lucide-react";

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, type = "warning", confirmText = "Confirmer", cancelText = "Annuler" }) {
  if (!isOpen) return null;

  const icons = {
    warning: <LogOut className="w-12 h-12 text-[#cf292c]" />,
    success: <CheckCircle className="w-12 h-12 text-green-500" />,
    info: <Info className="w-12 h-12 text-blue-500" />
  };

  const colors = {
    warning: {
      bg: "bg-red-50",
      text: "text-[#cf292c]",
      button: "bg-[#cf292c] hover:bg-[#b52428]"
    },
    success: {
      bg: "bg-green-50",
      text: "text-green-700",
      button: "bg-green-600 hover:bg-green-700"
    },
    info: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      button: "bg-[#cf292c] hover:bg-[#b52428]"
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const modal = (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-slideUp"
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 10000 }}
      >
        {/* Header */}
        <div className="relative p-6 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center text-center">
            <div className={`${colors[type].bg} p-4 rounded-full mb-4`}>
              {icons[type]}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {title}
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <p className="text-gray-600 text-center whitespace-pre-line leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-3 rounded-lg text-white font-medium ${colors[type].button} transition-colors shadow-lg`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export default ConfirmModal;
