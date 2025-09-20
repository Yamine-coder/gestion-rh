import React from 'react';

const NotificationBadge = ({ count, isActive = false }) => {
  if (!count || count === 0) return null;

  return (
    <span className={`
      inline-flex items-center justify-center text-xs font-semibold rounded-full
      min-w-[1.25rem] h-5 px-1.5
      ${isActive 
        ? "bg-white/20 text-white" 
        : "bg-red-100 text-[#cf292c]"
      }
      transition-colors duration-200
    `}>
      {count > 99 ? '99+' : count}
    </span>
  );
};

export default NotificationBadge;
