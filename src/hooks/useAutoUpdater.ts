import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { relaunch } from '@tauri-apps/plugin-process';
import { check } from '@tauri-apps/plugin-updater';

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function useAutoUpdater() {
  const { t } = useTranslation();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current || import.meta.env.DEV || !isTauriRuntime()) {
      return;
    }

    hasCheckedRef.current = true;
    let cancelled = false;
    let installStarted = false;

    void (async () => {
      try {
        const update = await check();
        if (!update || cancelled) {
          return;
        }

        const shouldInstall = window.confirm(
          t('updater.available', { version: update.version })
        );
        if (!shouldInstall || cancelled) {
          return;
        }

        installStarted = true;
        await update.downloadAndInstall();
        if (cancelled) {
          return;
        }

        window.alert(t('updater.installed'));
        await relaunch();
      } catch (error) {
        console.error('Auto updater failed:', error);
        if (!cancelled && installStarted) {
          window.alert(t('updater.failed'));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [t]);
}
