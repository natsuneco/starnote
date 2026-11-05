import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  className = '',
  ...props
}) => {
  const base =
    'bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all'
  const hoverStyles = interactive
    ? 'hover:shadow-md hover:border-slate-300 cursor-pointer active:scale-[0.99]'
    : ''

  return (
    <div className={`${base} ${hoverStyles} ${className}`} {...props}>
      {children}
    </div>
  )
}
