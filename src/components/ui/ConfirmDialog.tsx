import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmer',
  danger = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
        {message}
      </p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
