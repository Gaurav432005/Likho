import { FaSpinner } from "react-icons/fa";

export const Loading = ({ message = "Loading..." }) => {
  return (
    <div className="flex items-center justify-center h-96 w-full">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="bg-primary-50 p-4 rounded-full">
          <FaSpinner className="animate-spin text-3xl text-primary-600" />
        </div>
        <p className="text-slate-600 font-semibold">{message}</p>
      </div>
    </div>
  );
};