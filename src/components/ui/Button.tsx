import type { CSSProperties, ReactNode, ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  children: ReactNode
}

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
  },
  secondary: {
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-primary)',
    border: 'none',
  },
  danger: {
    background: 'var(--danger)',
    color: '#fff',
    border: 'none',
  },
}

const sizeStyles: Record<ButtonSize, CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: '13px', minHeight: '36px' },
  md: { padding: '10px 20px', fontSize: '14px', minHeight: 'var(--touch-min)' },
  lg: { padding: '14px 28px', fontSize: '16px', minHeight: '52px' },
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  style,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        borderRadius: 'var(--radius)',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all var(--transition)',
        width: fullWidth ? '100%' : undefined,
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
