import React from "react";
import * as Icons from "lucide-react";

interface CategoryIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = "", size = 18 }) => {
  // Safe dynamic lookup fallback from Lucide
  const LucideIcon = (Icons as any)[name] || Icons.Coins;
  return <LucideIcon className={className} size={size} />;
};
