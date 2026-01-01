import { useMemo, useState } from "react";

export const Avatar = ({ src, name, size = "md", className = "" }) => {
  const [error, setError] = useState(false);

  const sizes = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-base",
    xl: "w-24 h-24 text-xl"
  };

  const fallbackImage = useMemo(() => {
    const safeName = name ? name.replace(/ /g, "+") : "User";
    return `https://ui-avatars.com/api/?name=${safeName}&background=0f172a&color=fff&bold=true&length=1`;
  }, [name]);

  const optimizedSrc = useMemo(() => {
    if (!src) return null;
    if (src.includes("cloudinary.com")) {
        // Check if already has params
        if (src.includes("/upload/")) {
             return src.replace("/upload/", "/upload/w_200,h_200,c_fill,q_auto,f_auto/");
        }
    }
    return src;
  }, [src]);

  return (
    <div className={`relative inline-block rounded-full overflow-hidden bg-slate-200 shrink-0 ${sizes[size]} ${className}`}>
      <img 
        src={(!error && optimizedSrc) ? optimizedSrc : fallbackImage} 
        alt={name || "User"} 
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => setError(true)} 
      />
    </div>
  );
};