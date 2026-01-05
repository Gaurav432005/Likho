import { cn } from "../../utils/cn";

export const Button = ({ children, variant = 'primary', className, type, ...props }) => {
  const variants = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-200 active:shadow-md",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:bg-slate-100",
    danger: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 active:bg-red-200",
    ghost: "text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200",
  };

  return (
    <button 
      type={type || "button"}
      className={cn(
        "px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )} 
      {...props}
    >
      {children}
    </button>
  );
};