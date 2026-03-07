import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { scanPackages, updatePackage, uninstallPackage } from '../../ipc/commands';
import { useAppStore, PackageInfoStore } from '../../store';
import { ConfirmDialog } from '../shared/ConfirmDialog';

export function PackagesView() {
    const { t } = useTranslation();

    // Use global store for state that should persist across page switches
    const packages = useAppStore((state) => state.packagesData);
    const setPackages = useAppStore((state) => state.setPackagesData);
    const filterManager = useAppStore((state) => state.packagesFilterManager);
    const setFilterManager = useAppStore((state) => state.setPackagesFilterManager);
    const filterOutdated = useAppStore((state) => state.packagesFilterOutdated);
    const setFilterOutdated = useAppStore((state) => state.setPackagesFilterOutdated);

    // Local state for transient UI states
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [operatingPackage, setOperatingPackage] = useState<string | null>(null);
    const [pendingUninstall, setPendingUninstall] = useState<{ manager: string; name: string } | null>(null);

    const scanPackagesData = useCallback(async ({ preserveMessages = false }: { preserveMessages?: boolean } = {}) => {
        setIsScanning(true);
        if (!preserveMessages) {
            setError(null);
            setSuccess(null);
        }

        try {
            const detected = await scanPackages();
            setPackages(detected);
        } catch (e) {
            setError(String(e));
        } finally {
            setIsScanning(false);
        }
    }, [setPackages]);

    const handleScan = useCallback(() => {
        void scanPackagesData();
    }, [scanPackagesData]);

    const handleUpdate = async (manager: string, name: string) => {
        setOperatingPackage(`update-${manager}-${name}`);
        setError(null);
        setSuccess(null);

        try {
            await updatePackage(manager, name);
            setSuccess(t('packages.success_update', { name }));
            await scanPackagesData({ preserveMessages: true });
        } catch (e) {
            setError(String(e));
        } finally {
            setOperatingPackage(null);
        }
    };

    const handleUninstall = (manager: string, name: string) => {
        setPendingUninstall({ manager, name });
    };

    const confirmUninstall = async () => {
        if (!pendingUninstall) {
            return;
        }

        const { manager, name } = pendingUninstall;
        setPendingUninstall(null);
        setOperatingPackage(`uninstall-${manager}-${name}`);
        setError(null);
        setSuccess(null);

        try {
            await uninstallPackage(manager, name);
            setSuccess(t('packages.success_uninstall', { name }));
            await scanPackagesData({ preserveMessages: true });
        } catch (e) {
            setError(String(e));
        } finally {
            setOperatingPackage(null);
        }
    };

    const managerDisplayNames = useMemo<Record<string, string>>(() => ({
        npm: t('packages.managers.npm'),
        pip: t('packages.managers.pip'),
        cargo: t('packages.managers.cargo'),
        composer: t('packages.managers.composer'),
        homebrew: t('packages.managers.homebrew'),
        conda: t('packages.managers.conda'),
    }), [t]);

    const { managers, groupedPackages, outdatedCount } = useMemo(() => {
        const managerSet = new Set<string>();
        const grouped: Record<string, PackageInfoStore[]> = {};
        let nextOutdatedCount = 0;

        for (const pkg of packages) {
            managerSet.add(pkg.manager);

            if (pkg.is_outdated) {
                nextOutdatedCount += 1;
            }

            if (filterManager !== 'all' && pkg.manager !== filterManager) {
                continue;
            }

            if (filterOutdated && !pkg.is_outdated) {
                continue;
            }

            if (!grouped[pkg.manager]) {
                grouped[pkg.manager] = [];
            }

            grouped[pkg.manager].push(pkg);
        }

        return {
            managers: [...managerSet],
            groupedPackages: grouped,
            outdatedCount: nextOutdatedCount,
        };
    }, [packages, filterManager, filterOutdated]);

    return (
        <div className="view-container packages-view">
            <div className="view-header">
                <div>
                    <p className="text-secondary">{t('packages.description')}</p>
                    {packages.length > 0 && (
                        <p className="text-tertiary mt-4">
                            {t('packages.summary', { packages: packages.length, managers: managers.length })}
                            {outdatedCount > 0 && (
                                <span className="badge badge-warning ml-8">
                                    {outdatedCount} {t('packages.outdated')}
                                </span>
                            )}
                        </p>
                    )}
                </div>
                <button className="btn btn-primary" onClick={handleScan} disabled={isScanning}>
                    {isScanning ? (
                        <>
                            <span className="spinner spinner-sm" />
                            {t('common.loading')}
                        </>
                    ) : (
                        t('packages.refresh')
                    )}
                </button>
            </div>

            {/* Filters */}
            {packages.length > 0 && (
                <div className="filter-bar">
                    <select
                        className="filter-select"
                        value={filterManager}
                        onChange={(e) => setFilterManager(e.target.value)}
                    >
                        <option value="all">{t('packages.filter_all_managers')}</option>
                        {managers.map(m => (
                            <option key={m} value={m}>{managerDisplayNames[m] || m}</option>
                        ))}
                    </select>
                    <label className="filter-checkbox">
                        <input
                            type="checkbox"
                            checked={filterOutdated}
                            onChange={(e) => setFilterOutdated(e.target.checked)}
                        />
                        {t('packages.filter_outdated_only')}
                    </label>
                </div>
            )}

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

            {packages.length === 0 && !isScanning ? (
                <div className="card">
                    <div className="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                            <line x1="12" y1="22.08" x2="12" y2="12" />
                        </svg>
                        <p>{t('packages.empty')}</p>
                        <button className="btn btn-secondary" onClick={handleScan}>
                            {t('packages.refresh')}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="packages-grid">
                    {Object.entries(groupedPackages).map(([manager, managerPackages]) => (
                        <div key={manager} className="card packages-category">
                            <h3 className="category-title">
                                {managerDisplayNames[manager] || manager}
                                <span className="category-count">{managerPackages.length}</span>
                            </h3>
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th className="col-w-35">{t('packages.name')}</th>
                                            <th className="col-w-15">{t('packages.version')}</th>
                                            <th className="col-w-15">{t('packages.latest')}</th>
                                            <th className="col-w-15">{t('packages.status')}</th>
                                            <th className="col-w-20">{t('tools.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {managerPackages.map((pkg) => (
                                            <tr key={`${pkg.manager}-${pkg.name}`}>
                                                <td>
                                                    <strong>{pkg.name}</strong>
                                                    {pkg.description && (
                                                        <span className="pkg-description">{pkg.description}</span>
                                                    )}
                                                </td>
                                                <td>{pkg.version}</td>
                                                <td>{pkg.latest || '-'}</td>
                                                <td>
                                                    {pkg.is_outdated ? (
                                                        <span className="badge badge-warning">{t('packages.outdated')}</span>
                                                    ) : (
                                                        <span className="badge badge-success">{t('packages.up_to_date')}</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        {pkg.is_outdated && (
                                                            <button
                                                                className="btn btn-primary btn-small"
                                                                onClick={() => handleUpdate(pkg.manager, pkg.name)}
                                                                disabled={operatingPackage !== null}
                                                            >
                                                                {operatingPackage === `update-${pkg.manager}-${pkg.name}` ? (
                                                                    <span className="spinner spinner-xs" />
                                                                ) : (
                                                                    t('packages.update')
                                                                )}
                                                            </button>
                                                        )}
                                                        <button
                                                            className="btn btn-secondary btn-small"
                                                            onClick={() => handleUninstall(pkg.manager, pkg.name)}
                                                            disabled={operatingPackage !== null}
                                                        >
                                                            {operatingPackage === `uninstall-${pkg.manager}-${pkg.name}` ? (
                                                                <span className="spinner spinner-xs" />
                                                            ) : (
                                                                t('packages.uninstall')
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmDialog
                open={pendingUninstall !== null}
                title={t('packages.confirm_uninstall_title', { defaultValue: 'Uninstall Package' })}
                description={pendingUninstall ? t('packages.confirm_uninstall', { name: pendingUninstall.name }) : ''}
                danger
                onConfirm={confirmUninstall}
                onCancel={() => setPendingUninstall(null)}
            />
        </div>
    );
}
