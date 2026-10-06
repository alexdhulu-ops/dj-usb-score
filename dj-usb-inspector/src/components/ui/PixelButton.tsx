import React from 'react';

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export function PixelButton({ children, className = '', variant = 'primary', ...props }: PixelButtonProps) {
  let baseColors = 'bg-dj-gray text-white border-white/20';
  let shadowColor = '#000';
  let highlightColor = '#333';

  if (variant === 'primary') {
    baseColors = 'bg-dj-dark text-dj-orange border-dj-orange';
    shadowColor = '#000';
    highlightColor = '#ffaa00';
  } else if (variant === 'danger') {
    baseColors = 'bg-dj-dark text-dj-red border-dj-red';
    shadowColor = '#000';
    highlightColor = '#ff0055';
  }

  return (
    <button
      className={`
        font-press-start text-xs uppercase tracking-widest px-4 py-3
        border-2 active:translate-x-[2px] active:translate-y-[2px]
        active:shadow-none transition-transform pixelated
        ${baseColors} ${className}
      `}
      style={{
        boxShadow: `4px 4px 0 ${shadowColor}, -2px -2px 0 ${highlightColor}`
      }}
      {...props}
    >
      {children}
    </button>
  );
}
