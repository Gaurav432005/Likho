import { cn } from "../../utils/cn";

export const Button = ({ children, variant = 'primary', className, type, ...props }) => {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 shadow-lg",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50",
  };

  return (
    <button 
      type={type || "button"}
      className={cn(
        "px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )} 
      {...props}
    >
      {children}
    </button>
  );
};