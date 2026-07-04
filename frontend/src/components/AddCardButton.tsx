interface AddCardButtonProps {
  onClick: () => void
  label?: string
  className?: string
}

export default function AddCardButton({ onClick, label = 'Add task', className = '' }: AddCardButtonProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={`flex h-7 w-7 items-center justify-center rounded-lg border border-dashed border-[#D5D5DE] bg-white text-surface-muted transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-600 ${className}`}
      aria-label={label}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  )
}
