import { Button } from "./Button";
import { FaExclamationTriangle, FaRedo } from "react-icons/fa";

export const ErrorState = ({ 
  title = "Something went wrong",
  message,
  onRetry,
  actionLabel = "Try Again"
}) => {
  return (
    <div className="text-center flex flex-col justify-center items-center py-32 px-4">
      <div className="bg-red-50 p-5 rounded-full flex items-center justify-center text-red-600 mb-4 inline-flex">
        <FaExclamationTriangle size={40} />
      </div>
      <h3 className="font-bold text-xl text-red-900 mb-2">{title}</h3>
      {message && (
        <p className="text-red-600 text-sm mb-8 max-w-xs">{message}</p>
      )}
      {onRetry && (
        <Button onClick={onRetry} variant="danger" className="gap-2">
          <FaRedo /> {actionLabel}
        </Button>
      )}
    </div>
  );
};
