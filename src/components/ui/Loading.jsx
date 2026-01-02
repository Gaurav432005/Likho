import { FaSpinner } from "react-icons/fa";

export const Loading = ({ message = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-slate-400 gap-3 animate-fade-in">
      <FaSpinner className="animate-spin text-2xl text-slate-900" />
      <p className="text-xs font-bold uppercase tracking-wider opacity-80">{message}</p>
    </div>
  );
};