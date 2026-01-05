import { Button } from "./Button";

export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction
}) => {
  return (
    <div className="text-center flex flex-col justify-center items-center py-32 px-4">
      {Icon && (
        <div className="bg-primary-50 p-5 rounded-full mb-4 inline-flex">
          <Icon size={40} className="text-primary-600" />
        </div>
      )}
      <h3 className="font-bold text-xl text-slate-900 mb-2">{title}</h3>
      {description && (
        <p className="text-slate-600 text-sm mb-8 max-w-xs">{description}</p>
      )}
      {onAction && actionLabel && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
};
