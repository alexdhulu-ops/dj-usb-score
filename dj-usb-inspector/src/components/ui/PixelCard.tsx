import React from 'react';

interface PixelCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'alert' | 'success';
}

export function PixelCard({ children, className = '', variant = 'default', ...props }: PixelCardProps) {
  let borderColor = '#333';
  if (variant === 'alert') borderColor = '#ff0055';
  if (variant === 'success') borderColor = '#00ff66';

  return (
    <div
      className={`relative bg-dj-gray border-2 border-dj-dark p-6 ${className}`}
      style={{
        boxShadow: `4px 4px 0 #000, -2px -2px 0 ${borderColor}`
      }}
      {...props}
    >
      <div className="absolute top-0 left-0 w-2 h-2 bg-dj-dark/50" />
      <div className="absolute top-0 right-0 w-2 h-2 bg-dj-dark/50" />
      <div className="absolute bottom-0 left-0 w-2 h-2 bg-dj-dark/50" />
      <div className="absolute bottom-0 right-0 w-2 h-2 bg-dj-dark/50" />
      {children}
    </div>
  );
}
