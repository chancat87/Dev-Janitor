import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';

// Types matching Rust backend
interface SecurityFinding {
    tool_id: string;
    tool_name: string;
    issue: string;
    description: string;
    risk_level: 'Critical' | 'High' | 'Medium' | 'Low';
    remediation: string;
    details: string;
}

interface SecuritySummary {
    total_findings: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
}

interface SecurityScanResult {
    scan_time: string;
    tools_scanned: string[];
    findings: SecurityFinding[];
    summary: SecuritySummary;
}

interface SecurityToolInfo {
    id: string;
    name: string;
    description: string;
    docs_url: string;
    port_count: number;
    config_check_count: number;
}

export function SecurityScanView() {
    const { t } = useTranslation();

    const [isLoading, setIsLoading] = useState(false);
    const [scanResult, setScanResult] = useState<SecurityScanResult | null>(null);
    const [tools, setTools] = useState<SecurityToolInfo[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'scan' | 'tools'>('scan');
    const [filterRisk, setFilterRisk] = useState<string>('all');

    // Load supported tools on mount
    useEffect(() => {
        invoke<SecurityToolInfo[]>('get_security_tools_cmd')
            .then(setTools)
            .catch((e) => setError(String(e)));
    }, []);

    const handleScan = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await invoke<SecurityScanResult>('scan_security_cmd');
            setScanResult(result);
        } catch (e) {
            setError(String(e));
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleScanTool = useCallback(async (toolId: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await invoke<SecurityScanResult | null>('scan_tool_security_cmd', {
                toolId,
            });
            if (result) {
                setScanResult(result);
                setActiveTab('scan');
            }
        } catch (e) {
            setError(String(e));
        } finally {
            setIsLoading(false);
        }
    }, []);

    const riskEmojis: Record<string, string> = {
        Critical: '[C]',
        High: '[H]',
        Medium: '[M]',
        Low: '[L]',
    };

    const getRiskClass = (level: string) => `risk-${level.toLowerCase()}`;

    // Translate risk level from backend (English) to current locale
    const translateRiskLevel = (level: string): string => {
        const key = level.toLowerCase() as 'critical' | 'high' | 'medium' | 'low';
        return t(`security.risk_levels.${key}`);
    };

    const filteredFindings = scanResult?.findings.filter(
        (f) => filterRisk === 'all' || f.risk_level === filterRisk
    ) || [];

    return (
        <div className="view-container security-view">
            <div className="view-header">
                <div>
                    <p className="text-secondary">{t('security.description')}</p>
                    {scanResult && (
                        <p className="text-tertiary mt-4">
                            {t('security.last_scan')}: {scanResult.scan_time}
                        </p>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs" role="tablist">
                <button
                    role="tab"
                    aria-selected={activeTab === 'scan'}
                    aria-controls="panel-scan"
                    className={`tab ${activeTab === 'scan' ? 'active' : ''}`}
                    onClick={() => setActiveTab('scan')}
                >
                    {t('security.tab_scan')}
                </button>
                <button
                    role="tab"
                    aria-selected={activeTab === 'tools'}
                    aria-controls="panel-tools"
                    className={`tab ${activeTab === 'tools' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tools')}
                >
                    {t('security.tab_tools')} ({tools.length})
                </button>
            </div>

            {error && (
                <div className="card message-card error-card">
                    <p>{error}</p>
                </div>
            )}

            {/* Scan Tab */}
            {activeTab === 'scan' && (
                <div className="tab-content">
                    <div className="action-bar">
                        <button
                            className="btn btn-primary"
                            onClick={handleScan}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="spinner spinner-sm" />
                            ) : (
                                t('security.scan_all')
                            )}
                        </button>
                        {scanResult && scanResult.findings.length > 0 && (
                            <select
                                className="filter-select"
                                value={filterRisk}
                                onChange={(e) => setFilterRisk(e.target.value)}
                            >
                                <option value="all">
                                    {t('security.filter_all')} ({scanResult.findings.length})
                                </option>
                                {scanResult.summary.critical > 0 && (
                                    <option value="Critical">
                                        {riskEmojis.Critical} Critical ({scanResult.summary.critical})
                                    </option>
                                )}
                                {scanResult.summary.high > 0 && (
                                    <option value="High">
                                        {riskEmojis.High} High ({scanResult.summary.high})
                                    </option>
                                )}
                                {scanResult.summary.medium > 0 && (
                                    <option value="Medium">
                                        {riskEmojis.Medium} Medium ({scanResult.summary.medium})
                                    </option>
                                )}
                                {scanResult.summary.low > 0 && (
                                    <option value="Low">
                                        {riskEmojis.Low} Low ({scanResult.summary.low})
                                    </option>
                                )}
                            </select>
                        )}
                    </div>

                    {/* Pre-scan guide */}
                    {!scanResult && !isLoading && (
                        <div className="card card-centered">
                            <p className="text-secondary">{t('security.pre_scan_guide', { defaultValue: 'Click "Scan All" to check your AI tools for security issues.' })}</p>
                        </div>
                    )}

                    {/* Summary Cards */}
                    {scanResult && (
                        <div className="summary-grid">
                            <div className={`summary-card ${getRiskClass('Critical')}`}>
                                <span className="summary-count">
                                    {scanResult.summary.critical}
                                </span>
                                <span className="summary-label">{t('security.risk_levels.critical')}</span>
                            </div>
                            <div className={`summary-card ${getRiskClass('High')}`}>
                                <span className="summary-count">
                                    {scanResult.summary.high}
                                </span>
                                <span className="summary-label">{t('security.risk_levels.high')}</span>
                            </div>
                            <div className={`summary-card ${getRiskClass('Medium')}`}>
                                <span className="summary-count">
                                    {scanResult.summary.medium}
                                </span>
                                <span className="summary-label">{t('security.risk_levels.medium')}</span>
                            </div>
                            <div className={`summary-card ${getRiskClass('Low')}`}>
                                <span className="summary-count">
                                    {scanResult.summary.low}
                                </span>
                                <span className="summary-label">{t('security.risk_levels.low')}</span>
                            </div>
                        </div>
                    )}

                    {/* No issues found */}
                    {scanResult && scanResult.findings.length === 0 && (
                        <div className="card success-card card-centered">
                            <span className="security-ok">OK</span>
                            <h3>{t('security.no_issues')}</h3>
                            <p className="text-secondary">{t('security.no_issues_desc')}</p>
                        </div>
                    )}

                    {/* Findings List */}
                    {filteredFindings.length > 0 && (
                        <div className="findings-list">
                            {filteredFindings.map((finding, idx) => (
                                <div
                                    key={`${finding.tool_id}-${idx}`}
                                    className={`finding-card ${getRiskClass(finding.risk_level)}`}
                                >
                                    <div className="finding-header">
                                        <span className={`risk-badge ${getRiskClass(finding.risk_level)}`}>
                                            {riskEmojis[finding.risk_level]} {translateRiskLevel(finding.risk_level)}
                                        </span>
                                        <span className="tool-name">{finding.tool_name}</span>
                                    </div>
                                    <h4 className="finding-issue">{finding.issue}</h4>
                                    <p className="finding-description">{finding.description}</p>
                                    <div className="finding-details">
                                        <code>{finding.details}</code>
                                    </div>
                                    <div className="finding-remediation">
                                        <strong>{t('security.remediation')}:</strong>
                                        <span>{finding.remediation}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tools Tab */}
            {activeTab === 'tools' && (
                <div className="tab-content">
                    <p className="text-secondary mb-md">
                        {t('security.tools_description')}
                    </p>
                    <div className="tools-grid">
                        {tools.map((tool) => (
                            <div key={tool.id} className="tool-card">
                                <h4>{tool.name}</h4>
                                <p className="text-secondary">{tool.description}</p>
                                <div className="tool-meta">
                                    <span>{tool.port_count} {t('security.ports')}</span>
                                    <span>{tool.config_check_count} {t('security.checks')}</span>
                                </div>
                                <div className="tool-actions">
                                    <button
                                        className="btn btn-secondary btn-small"
                                        onClick={() => handleScanTool(tool.id)}
                                        disabled={isLoading}
                                    >
                                        {t('security.scan_tool')}
                                    </button>
                                    <a
                                        href={tool.docs_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-ghost btn-small"
                                    >
                                        {t('security.docs')}
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
