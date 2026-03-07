import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { relaunch } from '@tauri-apps/plugin-process';
import { check } from '@tauri-apps/plugin-updater';

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

type AvailableUpdate = NonNullable<Awaited<ReturnType<typeof check>>>;

export function useAutoUpdater() {
  const { t } = useTranslation();
  const hasCheckedRef = useRef(false);
  const cancelledRef = useRef(false);
  const [pendingUpdate, setPendingUpdate] = useState<AvailableUpdate | null>(null);

  useEffect(() => {
    if (hasCheckedRef.current || import.meta.env.DEV || !isTauriRuntime()) {
      return;
    }

    hasCheckedRef.current = true;
    cancelledRef.current = false;

    void (async () => {
      try {
        const update = await check();
        if (!update || cancelledRef.current) {
          return;
        }

        setPendingUpdate(update);
      } catch (error) {
        console.error('Auto updater failed:', error);
      }
    })();

    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const cancelInstall = useCallback(() => {
    setPendingUpdate(null);
  }, []);

  const confirmInstall = useCallback(async () => {
    if (!pendingUpdate) {
      return;
    }

    const update = pendingUpdate;
    setPendingUpdate(null);

    try {
      await update.downloadAndInstall();
      if (cancelledRef.current) {
        return;
      }

      window.alert(t('updater.installed'));
      await relaunch();
    } catch (error) {
      console.error('Auto updater failed:', error);
      if (!cancelledRef.current) {
        window.alert(t('updater.failed'));
      }
    }
  }, [pendingUpdate, t]);

  return {
    pendingUpdate,
    confirmInstall,
    cancelInstall,
  };
}
