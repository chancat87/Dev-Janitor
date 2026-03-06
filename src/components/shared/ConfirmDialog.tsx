import * as Dialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel,
    cancelLabel,
    danger,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const { t } = useTranslation();

    return (
        <Dialog.Root open={open} onOpenChange={(v) => !v && onCancel()}>
            <Dialog.Portal>
                <Dialog.Overlay className="confirm-overlay" />
                <Dialog.Content className="confirm-content">
                    <Dialog.Title className="confirm-title">{title}</Dialog.Title>
                    <Dialog.Description className="confirm-description">
                        {description}
                    </Dialog.Description>
                    <div className="confirm-actions">
                        <button className="btn btn-secondary" onClick={onCancel}>
                            {cancelLabel ?? t('common.cancel', { defaultValue: 'Cancel' })}
                        </button>
                        <button
                            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
                            onClick={onConfirm}
                        >
                            {confirmLabel ?? t('common.confirm', { defaultValue: 'Confirm' })}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
            <style>{`
                .confirm-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 1000;
                }
                .confirm-content {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: var(--color-bg-primary);
                    border: 1px solid var(--color-border);
                    border-radius: var(--border-radius-md);
                    padding: var(--spacing-lg);
                    min-width: 340px;
                    max-width: 480px;
                    z-index: 1001;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.24);
                }
                .confirm-title {
                    margin: 0 0 var(--spacing-sm) 0;
                    font-size: var(--font-size-md);
                    font-weight: 600;
                    color: var(--color-text-primary);
                }
                .confirm-description {
                    margin: 0 0 var(--spacing-lg) 0;
                    font-size: var(--font-size-sm);
                    color: var(--color-text-secondary);
                    white-space: pre-wrap;
                    word-break: break-word;
                }
                .confirm-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: var(--spacing-sm);
                }
                .btn-secondary {
                    background: var(--color-bg-tertiary);
                    color: var(--color-text-primary);
                    border: 1px solid var(--color-border);
                }
                .btn-danger {
                    background: var(--color-danger);
                    color: white;
                }
            `}</style>
        </Dialog.Root>
    );
}
