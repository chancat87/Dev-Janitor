import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { scanCaches, scanProjectCaches, cleanCache, cleanMultipleCaches } from '../../ipc/commands';
import { useAppStore, CacheInfoStore } from '../../store';
import { ConfirmDialog } from '../shared/ConfirmDialog';

type PendingCacheCleanAction =
    | {
        kind: 'selected';
        tab: 'package' | 'project';
        paths: string[];
        count: number;
        sizeDisplay: string;
    }
    | {
        kind: 'single';
        tab: 'package' | 'project';
        cache: CacheInfoStore;
        displayName: string;
    };

export function CacheView() {
    const { t } = useTranslation();

    // Use global store for data that should persist
    const packageCaches = useAppStore((state) => state.cachePackageData);
    const setPackageCaches = useAppStore((state) => state.setCachePackageData);
    const projectCaches = useAppStore((state) => state.cacheProjectData);
    const setProjectCaches = useAppStore((state) => state.setCacheProjectData);
    const projectPath = useAppStore((state) => state.cacheProjectPath);
    const setProjectPath = useAppStore((state) => state.setCacheProjectPath);

    // Local state for transient UI
    const [isScanning, setIsScanning] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [selectedPackageCaches, setSelectedPackageCaches] = useState<Set<string>>(new Set());
    const [selectedProjectCaches, setSelectedProjectCaches] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'package' | 'project'>('package');
    const [pendingCleanAction, setPendingCleanAction] = useState<PendingCacheCleanAction | null>(null);

    const scanPackageCachesData = useCallback(async ({ preserveMessages = false }: { preserveMessages?: boolean } = {}) => {
        setIsScanning(true);
        if (!preserveMessages) {
            setError(null);
            setSuccess(null);
        }

        try {
            const caches = await scanCaches();
            setPackageCaches(caches);
        } catch (e) {
            setError(String(e));
        } finally {
            setIsScanning(false);
        }
    }, [setPackageCaches]);

    const handleScanPackageCaches = useCallback(() => {
        void scanPackageCachesData();
    }, [scanPackageCachesData]);

    const scanProjectCachesData = useCallback(async ({ preserveMessages = false }: { preserveMessages?: boolean } = {}) => {
        if (!projectPath.trim()) {
            setError(t('cache.error_no_project_path'));
            return;
        }

        setIsScanning(true);
        if (!preserveMessages) {
            setError(null);
            setSuccess(null);
        }

        try {
            const caches = await scanProjectCaches(projectPath, 5);
            setProjectCaches(caches);
        } catch (e) {
            setError(String(e));
        } finally {
            setIsScanning(false);
        }
    }, [projectPath, setProjectCaches, t]);

    const handleScanProjectCaches = useCallback(() => {
        void scanProjectCachesData();
    }, [scanProjectCachesData]);

    const toggleCacheSelection = (path: string) => {
        const selectedCaches = activeTab === 'package' ? selectedPackageCaches : selectedProjectCaches;
        const setSelectedCaches = activeTab === 'package' ? setSelectedPackageCaches : setSelectedProjectCaches;
        const newSelected = new Set(selectedCaches);
        if (newSelected.has(path)) {
            newSelected.delete(path);
        } else {
            newSelected.add(path);
        }
        setSelectedCaches(newSelected);
    };

    const selectAllCaches = (
        caches: CacheInfoStore[],
        selected: Set<string>,
        setSelected: (next: Set<string>) => void
    ) => {
        const newSelected = new Set(selected);
        caches.forEach(c => newSelected.add(c.path));
        setSelected(newSelected);
    };

    const deselectAllCaches = (
        caches: CacheInfoStore[],
        selected: Set<string>,
        setSelected: (next: Set<string>) => void
    ) => {
        const newSelected = new Set(selected);
        caches.forEach(c => newSelected.delete(c.path));
        setSelected(newSelected);
    };

    const handleCleanSelected = async () => {
        const selectedCaches = activeTab === 'package' ? selectedPackageCaches : selectedProjectCaches;
        if (selectedCaches.size === 0) {
            setError(t('cache.error_no_selection'));
            return;
        }

        const sizeDisplay = formatSize(selectedSize);
        setPendingCleanAction({
            kind: 'selected',
            tab: activeTab,
            paths: [...selectedCaches],
            count: selectedCaches.size,
            sizeDisplay,
        });
    };

    const handleCleanSingle = (cache: CacheInfoStore) => {
        setPendingCleanAction({
            kind: 'single',
            tab: activeTab,
            cache,
            displayName: getCacheDisplayName(cache),
        });
    };

    const confirmClean = async () => {
        if (!pendingCleanAction) {
            return;
        }

        const action = pendingCleanAction;
        setPendingCleanAction(null);
        setIsCleaning(true);
        setError(null);
        setSuccess(null);

        try {
            if (action.kind === 'selected') {
                const results = await cleanMultipleCaches(action.paths);
                const successCount = results.filter(r => r.Ok).length;
                const failCount = results.filter(r => r.Err).length;

                if (failCount > 0) {
                    const errors = results.filter(r => r.Err).map(r => r.Err).join('\n');
                    setError(t('cache.partial_failed', { count: failCount, errors }));
                }

                if (successCount > 0) {
                    setSuccess(t('cache.success_cleaned', { count: successCount }));
                }

                if (action.tab === 'package') {
                    setSelectedPackageCaches(new Set());
                    await scanPackageCachesData({ preserveMessages: true });
                } else {
                    setSelectedProjectCaches(new Set());
                    await scanProjectCachesData({ preserveMessages: true });
                }
            } else {
                await cleanCache(action.cache.path);
                setSuccess(t('cache.success_clean_single', {
                    name: action.displayName,
                    size: action.cache.size_display,
                }));

                if (action.tab === 'package') {
                    await scanPackageCachesData({ preserveMessages: true });
                } else {
                    await scanProjectCachesData({ preserveMessages: true });
                }
            }
        } catch (e) {
            setError(String(e));
        } finally {
            setIsCleaning(false);
        }
    };

    const formatSize = (bytes: number): string => {
        const KB = 1024;
        const MB = KB * 1024;
        const GB = MB * 1024;

        if (bytes >= GB) return `${(bytes / GB).toFixed(2)} GB`;
        if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`;
        if (bytes >= KB) return `${(bytes / KB).toFixed(2)} KB`;
        return `${bytes} B`;
    };

    const { currentCaches, selectedCaches, totalSize, selectedSize } = useMemo(() => {
        const nextCurrentCaches = activeTab === 'package' ? packageCaches : projectCaches;
        const nextSelectedCaches = activeTab === 'package' ? selectedPackageCaches : selectedProjectCaches;
        let nextTotalSize = 0;
        let nextSelectedSize = 0;

        for (const cache of nextCurrentCaches) {
            nextTotalSize += cache.size;

            if (nextSelectedCaches.has(cache.path)) {
                nextSelectedSize += cache.size;
            }
        }

        return {
            currentCaches: nextCurrentCaches,
            selectedCaches: nextSelectedCaches,
            totalSize: nextTotalSize,
            selectedSize: nextSelectedSize,
        };
    }, [activeTab, packageCaches, projectCaches, selectedPackageCaches, selectedProjectCaches]);

    const cacheNameMap = useMemo<Record<string, string>>(() => ({
        'npm Cache': t('cache.names.npm'),
        'Yarn Cache': t('cache.names.yarn'),
        'pnpm Cache': t('cache.names.pnpm'),
        'pip Cache': t('cache.names.pip'),
        'Conda Cache': t('cache.names.conda'),
        'Cargo Cache': t('cache.names.cargo'),
        'Composer Cache': t('cache.names.composer'),
        'Maven Cache': t('cache.names.maven'),
        'Gradle Cache': t('cache.names.gradle'),
        'Homebrew Cache': t('cache.names.homebrew'),
        'Go Modules Cache': t('cache.names.go_modules'),
        'Node Modules': t('cache.names.node_modules'),
        'Rust Target': t('cache.names.rust_target'),
        'Python Cache': t('cache.names.python_cache'),
        'Gradle Build': t('cache.names.gradle_build'),
        'Build Output': t('cache.names.build_output'),
        'Dist Output': t('cache.names.dist_output'),
        'Next.js Cache': t('cache.names.next_cache'),
        'Nuxt.js Cache': t('cache.names.nuxt_cache'),
        'Turbo Cache': t('cache.names.turbo_cache'),
        'Python Venv': t('cache.names.python_venv'),
        'Vendor Directory': t('cache.names.vendor_directory'),
    }), [t]);

    const getCacheDisplayName = useCallback((cache: CacheInfoStore) => cacheNameMap[cache.name] || cache.name, [cacheNameMap]);

    return (
        <div className="view-container cache-view">
            <div className="view-header">
                <div>
                    <p className="text-secondary">{t('cache.description')}</p>
                    {currentCaches.length > 0 && (
                        <p className="text-tertiary mt-4">
                            {t('cache.total_size', { size: formatSize(totalSize) })}
                            {selectedCaches.size > 0 && (
                                <span className="badge badge-primary ml-8">
                                    {t('cache.selected_summary', {
                                        count: selectedCaches.size,
                                        size: formatSize(selectedSize),
                                    })}
                                </span>
                            )}
                        </p>
                    )}
                </div>
                <div className="header-actions">
                    {selectedCaches.size > 0 && (
                        <button
                            className="btn btn-danger"
                            onClick={handleCleanSelected}
                            disabled={isCleaning}
                        >
                            {isCleaning ? (
                                <span className="spinner spinner-sm" />
                            ) : (
                                t('cache.clean_selected')
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'package' ? 'active' : ''}`}
                    onClick={() => setActiveTab('package')}
                >
                    {t('cache.package_caches')}
                </button>
                <button
                    className={`tab ${activeTab === 'project' ? 'active' : ''}`}
                    onClick={() => setActiveTab('project')}
                >
                    {t('cache.project_caches')}
                </button>
            </div>

            {error && (
                <div className="card message-card error-card">
                    <p>{error}</p>
                </div>
            )}

            {success && (
                <div className="card message-card success-card">
                    <p>{success}</p>
                </div>
            )}

            {/* Package Manager Caches Tab */}
            {activeTab === 'package' && (
                <div className="tab-content">
                    <div className="scan-bar">
                        <button
                            className="btn btn-primary"
                            onClick={handleScanPackageCaches}
                            disabled={isScanning}
                        >
                            {isScanning ? (
                                <>
                                    <span className="spinner spinner-sm" />
                                    {t('common.loading')}
                                </>
                            ) : (
                                t('cache.scan_package_caches')
                            )}
                        </button>
                        {packageCaches.length > 0 && (
                            <div className="select-actions">
                                <button className="btn btn-secondary btn-small" onClick={() => selectAllCaches(packageCaches, selectedPackageCaches, setSelectedPackageCaches)}>
                                    {t('common.select_all')}
                                </button>
                                <button className="btn btn-secondary btn-small" onClick={() => deselectAllCaches(packageCaches, selectedPackageCaches, setSelectedPackageCaches)}>
                                    {t('common.deselect_all')}
                                </button>
                            </div>
                        )}
                    </div>

                    {packageCaches.length > 0 && (
                        <div className="card">
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th className="col-w-5"></th>
                                            <th className="col-w-20">{t('cache.name')}</th>
                                            <th className="col-w-50">{t('cache.path')}</th>
                                            <th className="col-w-15">{t('cache.size')}</th>
                                            <th className="col-w-10">{t('tools.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {packageCaches.map((cache) => (
                                            <tr key={cache.id}>
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPackageCaches.has(cache.path)}
                                                        onChange={() => toggleCacheSelection(cache.path)}
                                                    />
                                                </td>
                                                <td><strong>{getCacheDisplayName(cache)}</strong></td>
                                                <td className="path-cell">{cache.path}</td>
                                                <td className="size-cell">{cache.size_display}</td>
                                                <td>
                                                    <button
                                                        className="btn btn-danger btn-small"
                                                        onClick={() => handleCleanSingle(cache)}
                                                        disabled={isCleaning}
                                                    >
                                                        {t('cache.clean')}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Project Caches Tab */}
            {activeTab === 'project' && (
                <div className="tab-content">
                    <div className="scan-bar project-scan">
                        <input
                            type="text"
                            className="path-input"
                            placeholder={t('cache.project_path_placeholder')}
                            value={projectPath}
                            onChange={(e) => setProjectPath(e.target.value)}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleScanProjectCaches}
                            disabled={isScanning || !projectPath.trim()}
                        >
                            {isScanning ? (
                                <>
                                    <span className="spinner spinner-sm" />
                                    {t('common.loading')}
                                </>
                            ) : (
                                t('cache.scan_project_caches')
                            )}
                        </button>
                    </div>

                    {projectCaches.length > 0 && (
                        <>
                            <div className="select-actions">
                                <button className="btn btn-secondary btn-small" onClick={() => selectAllCaches(projectCaches, selectedProjectCaches, setSelectedProjectCaches)}>
                                    {t('common.select_all')}
                                </button>
                                <button className="btn btn-secondary btn-small" onClick={() => deselectAllCaches(projectCaches, selectedProjectCaches, setSelectedProjectCaches)}>
                                    {t('common.deselect_all')}
                                </button>
                            </div>
                            <div className="card">
                                <div className="table-container">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th className="col-w-5"></th>
                                                <th className="col-w-15">{t('cache.name')}</th>
                                                <th className="col-w-55">{t('cache.path')}</th>
                                                <th className="col-w-15">{t('cache.size')}</th>
                                                <th className="col-w-10">{t('tools.actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {projectCaches.map((cache) => (
                                                <tr key={cache.id}>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedProjectCaches.has(cache.path)}
                                                            onChange={() => toggleCacheSelection(cache.path)}
                                                        />
                                                    </td>
                                                    <td><strong>{getCacheDisplayName(cache)}</strong></td>
                                                    <td className="path-cell">{cache.path}</td>
                                                    <td className="size-cell">{cache.size_display}</td>
                                                    <td>
                                                        <button
                                                            className="btn btn-danger btn-small"
                                                            onClick={() => handleCleanSingle(cache)}
                                                            disabled={isCleaning}
                                                        >
                                                            {t('cache.clean')}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            <ConfirmDialog
                open={pendingCleanAction !== null}
                title={pendingCleanAction?.kind === 'single'
                    ? t('cache.confirm_clean_single_title', { defaultValue: 'Clean Cache' })
                    : t('cache.confirm_clean_title', { defaultValue: 'Clean Caches' })}
                description={pendingCleanAction
                    ? pendingCleanAction.kind === 'single'
                        ? t('cache.confirm_clean_single', {
                            name: pendingCleanAction.displayName,
                            size: pendingCleanAction.cache.size_display,
                        })
                        : t('cache.confirm_clean', {
                            count: pendingCleanAction.count,
                            size: pendingCleanAction.sizeDisplay,
                        })
                    : ''}
                danger
                onConfirm={confirmClean}
                onCancel={() => setPendingCleanAction(null)}
            />
        </div>
    );
}
