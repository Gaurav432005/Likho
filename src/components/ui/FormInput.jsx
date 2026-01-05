import { cn } from "../../utils/cn";
import { FaExclamationCircle } from "react-icons/fa";

/**
 * Reusable Form Input Component with validation
 * Handles text, email, password, textarea
 */
export const FormInput = ({ 
  label,
  type = "text",
  icon: Icon,
  error,
  placeholder,
  value,
  onChange,
  onFocus,
  disabled = false,
  autoComplete,
  ariaLabel,
  className,
  ...props
}) => {
  const isTextarea = type === "textarea";
  const Component = isTextarea ? "textarea" : "input";

  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative group">
        {Icon && (
          <Icon className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
            error 
              ? "text-red-400" 
              : "text-slate-400 group-focus-within:text-slate-900"
          )} />
        )}
        <Component
          type={isTextarea ? undefined : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-label={ariaLabel}
          className={cn(
            "w-full py-3 bg-gray-50 border-2 rounded-2xl text-slate-800 font-semibold outline-none focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed",
            Icon ? "pl-11 pr-4" : "px-4",
            error 
              ? "border-red-400 focus:border-red-600" 
              : "border-gray-200 focus:border-slate-900",
            className
          )}
          {...props}
        />
        {error && (
          <div className="mt-1 flex items-center gap-1">
            <FaExclamationCircle className="text-red-500 text-xs" />
            <p className="text-red-500 text-xs">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};
