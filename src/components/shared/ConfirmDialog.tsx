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
        </Dialog.Root>
    );
}
