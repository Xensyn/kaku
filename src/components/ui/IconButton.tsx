import type { CSSProperties, ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  size?: number
  label?: string
}

export function IconButton({ children, size = 44, label, style, ...props }: IconButtonProps) {
  const buttonStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: 'var(--radius)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: 'none',
    cursor: 'pointer',
    transition: 'all var(--transition)',
    ...style,
  }

  return (
    <button style={buttonStyle} aria-label={label} title={label} {...props}>
      {children}
    </button>
  )
}
