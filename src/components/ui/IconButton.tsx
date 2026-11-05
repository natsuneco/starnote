import React from 'react'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  variant?: 'default' | 'tool' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  label: string
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  active = false,
  variant = 'default',
  size = 'md',
  label,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 active:scale-95 disabled:opacity-50 disabled:pointer-events-none'

  const sizeStyles = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  }

  let style = 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:ring-slate-300'

  if (variant === 'tool') {
    style = active
      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
  } else if (variant === 'danger') {
    style = 'text-rose-500 hover:bg-rose-50 hover:text-rose-600 focus:ring-rose-400'
  }

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${style} ${className}`}
      aria-label={label}
      title={label}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
