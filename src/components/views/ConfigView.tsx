import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { diagnoseEnv, EnvDiagnosis } from '../../ipc/commands';

export function ConfigView() {
    const { t } = useTranslation();
    const [diagnosis, setDiagnosis] = useState<EnvDiagnosis | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'path' | 'shell' | 'issues'>('path');
    const [showDevOnly, setShowDevOnly] = useState(false);

    const handleDiagnose = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await diagnoseEnv();
            setDiagnosis(result);
        } catch (e) {
            setError(String(e));
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Filter PATH entries
    const filteredPaths = diagnosis?.path_entries.filter(p =>
        !showDevOnly || p.is_dev_related
    ) || [];

    const existingShellConfigs = diagnosis?.shell_configs.filter(c => c.exists) || [];

    const getSeverityClass = (severity: string) => `severity-${severity}`;

    return (
        <div className="view-container config-view">
            <div className="view-header">
                <div>
                    <p className="text-secondary">{t('config.description')}</p>
                    {diagnosis && (
                        <p className="text-tertiary mt-4">
                            {t('config.summary', {
                                paths: diagnosis.path_entries.length,
                                configs: existingShellConfigs.length,
                            })}
                        </p>
                    )}
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleDiagnose}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <span className="spinner spinner-sm" />
                            {t('config.diagnosing')}
                        </>
                    ) : (
                        t('config.diagnose')
                    )}
                </button>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'path' ? 'active' : ''}`}
                    onClick={() => setActiveTab('path')}
                >
                    {t('config.tab_path')}
                    {diagnosis && (
                        <span className="tab-count">{diagnosis.path_entries.length}</span>
                    )}
                </button>
                <button
                    className={`tab ${activeTab === 'shell' ? 'active' : ''}`}
                    onClick={() => setActiveTab('shell')}
                >
                    {t('config.tab_shell')}
                    {diagnosis && (
                        <span className="tab-count">{existingShellConfigs.length}</span>
                    )}
                </button>
                <button
                    className={`tab ${activeTab === 'issues' ? 'active' : ''}`}
                    onClick={() => setActiveTab('issues')}
                >
                    {t('config.tab_issues')}
                    {diagnosis && diagnosis.issues.length > 0 && (
                        <span className="tab-count warning">{diagnosis.issues.length}</span>
                    )}
                </button>
            </div>

            {error && (
                <div className="card message-card error-card">
                    <p>{error}</p>
                </div>
            )}

            {/* PATH Tab */}
            {activeTab === 'path' && diagnosis && (
                <div className="tab-content">
                    <div className="filter-bar">
                        <label className="filter-checkbox">
                            <input
                                type="checkbox"
                                checked={showDevOnly}
                                onChange={(e) => setShowDevOnly(e.target.checked)}
                            />
                            {t('config.filter_dev_only')}
                        </label>
                    </div>

                    <div className="card">
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th className="col-w-5">{t('config.table_index')}</th>
                                        <th className="col-w-45">{t('config.table_path')}</th>
                                        <th className="col-w-15">{t('config.table_category')}</th>
                                        <th className="col-w-10">{t('config.table_exists')}</th>
                                        <th className="col-w-25">{t('config.table_issues')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPaths.map((entry, idx) => (
                                        <tr key={idx} className={entry.issues.length > 0 ? 'issue-row' : ''}>
                                            <td>{idx + 1}</td>
                                            <td className="path-cell">{entry.path}</td>
                                            <td>
                                                <span className={`category-badge ${entry.is_dev_related ? 'dev' : 'system'}`}>
                                                    {entry.category}
                                                </span>
                                            </td>
                                            <td>
                                                {entry.exists ? (
                                                    <span className="status-ok">{t('common.yes')}</span>
                                                ) : (
                                                    <span className="status-error">{t('common.no')}</span>
                                                )}
                                            </td>
                                            <td>
                                                {entry.issues.length > 0 && (
                                                    <span className="issue-text">
                                                        {entry.issues.join(', ')}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Shell Configs Tab */}
            {activeTab === 'shell' && diagnosis && (
                <div className="tab-content">
                    {existingShellConfigs.length === 0 ? (
                        <div className="card empty-state">
                            <p>{t('config.no_shell_configs')}</p>
                        </div>
                    ) : (
                        <div className="shell-configs">
                            {existingShellConfigs.map((config, idx) => (
                                <div key={idx} className="card shell-config">
                                    <div className="config-header">
                                        <h4>{config.name}</h4>
                                        <span className="config-path">{config.path}</span>
                                    </div>

                                    {config.dev_exports.length > 0 && (
                                        <div className="exports-section">
                                            <h5>{t('config.dev_exports', { count: config.dev_exports.length })}</h5>
                                            <pre className="exports-code">
                                                {config.dev_exports.join('\n')}
                                            </pre>
                                        </div>
                                    )}

                                    {config.issues.length > 0 && (
                                        <div className="config-issues">
                                            {config.issues.map((issue, i) => (
                                                <span key={i} className="issue-badge">{issue}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Issues Tab */}
            {activeTab === 'issues' && diagnosis && (
                <div className="tab-content">
                    {diagnosis.issues.length === 0 && diagnosis.suggestions.length === 0 ? (
                        <div className="card success-card">
                            <p>{t('config.no_issues')}</p>
                        </div>
                    ) : (
                        <>
                            {diagnosis.issues.length > 0 && (
                                <div className="card">
                                    <h4 className="section-title">{t('config.issues_found')}</h4>
                                    <div className="issues-list">
                                        {diagnosis.issues.map((issue, idx) => (
                                            <div key={idx} className="issue-item">
                                                <span className={`severity-badge ${getSeverityClass(issue.severity)}`}>
                                                    {issue.severity}
                                                </span>
                                                <div className="issue-content">
                                                    <strong className="issue-category">{issue.category}</strong>
                                                    <p className="issue-message">{issue.message}</p>
                                                    {issue.suggestion && (
                                                        <p className="issue-suggestion">
                                                            {t('config.suggestion', { suggestion: issue.suggestion })}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {diagnosis.suggestions.length > 0 && (
                                <div className="card">
                                    <h4 className="section-title">{t('config.suggestions')}</h4>
                                    <ul className="suggestions-list">
                                        {diagnosis.suggestions.map((suggestion, idx) => (
                                            <li key={idx}>{suggestion}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
