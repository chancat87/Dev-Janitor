import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    getDevProcesses, getPorts, killProcess,
    ProcessInfo, PortInfo
} from '../../ipc/commands';

export function ServicesView() {
    const { t } = useTranslation();
    const [processes, setProcesses] = useState<ProcessInfo[]>([]);
    const [ports, setPorts] = useState<PortInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'processes' | 'ports'>('processes');
    const [filterCategory, setFilterCategory] = useState<string>('all');

    const handleRefreshProcesses = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const procs = await getDevProcesses();
            setProcesses(procs);
        } catch (e) {
            setError(String(e));
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleRefreshPorts = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const portList = await getPorts();
            setPorts(portList);
        } catch (e) {
            setError(String(e));
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleKillProcess = async (pid: number, name: string) => {
        if (!confirm(`Terminate process "${name}" (PID: ${pid})?`)) {
            return;
        }

        setError(null);
        setSuccess(null);

        try {
            const result = await killProcess(pid);
            setSuccess(result);
            await handleRefreshProcesses();
        } catch (e) {
            setError(String(e));
        }
    };

    // Get categories from processes
    const categories = [...new Set(processes.map(p => p.category))];

    // Filter processes
    const filteredProcesses = filterCategory === 'all'
        ? processes
        : processes.filter(p => p.category === filterCategory);

    // Calculate totals
    const totalMemory = processes.reduce((sum, p) => sum + p.memory, 0);
    const formatMemory = (bytes: number): string => {
        const MB = 1024 * 1024;
        const GB = MB * 1024;
        if (bytes >= GB) return `${(bytes / GB).toFixed(2)} GB`;
        if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`;
        return `${(bytes / 1024).toFixed(2)} KB`;
    };

    const categoryColors: Record<string, string> = {
        'Runtime': '#52c41a',
        'Package Manager': '#1890ff',
        'Build Tool': '#faad14',
        'Server': '#722ed1',
        'Database': '#eb2f96',
        'Container': '#13c2c2',
        'IDE': '#2f54eb',
        'Editor': '#2f54eb',
        'AI Tool': '#ff4d4f',
        'Version Control': '#595959',
        'Dev Server': '#fa541c',
        'Other': '#8c8c8c',
    };

    return (
        <div className="view-container">
            <div className="view-header">
                <div>
                    <p className="text-secondary">{t('services.description')}</p>
                    {activeTab === 'processes' && processes.length > 0 && (
                        <p className="text-tertiary" style={{ marginTop: 4 }}>
                            {processes.length} dev processes using {formatMemory(totalMemory)}
                        </p>
                    )}
                    {activeTab === 'ports' && ports.length > 0 && (
                        <p className="text-tertiary" style={{ marginTop: 4 }}>
                            {ports.length} ports in use
                        </p>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'processes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('processes')}
                >
                    Processes
                </button>
                <button
                    className={`tab ${activeTab === 'ports' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ports')}
                >
                    Ports
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

            {/* Processes Tab */}
            {activeTab === 'processes' && (
                <div className="tab-content">
                    <div className="action-bar">
                        <button
                            className="btn btn-primary"
                            onClick={handleRefreshProcesses}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="spinner" style={{ width: 14, height: 14 }} />
                            ) : (
                                'Refresh'
                            )}
                        </button>
                        {categories.length > 0 && (
                            <select
                                className="filter-select"
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                            >
                                <option value="all">All Categories ({processes.length})</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>
                                        {cat} ({processes.filter(p => p.category === cat).length})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {filteredProcesses.length > 0 && (
                        <div className="card">
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '8%' }}>PID</th>
                                            <th style={{ width: '20%' }}>Name</th>
                                            <th style={{ width: '15%' }}>Category</th>
                                            <th style={{ width: '12%' }}>Memory</th>
                                            <th style={{ width: '10%' }}>CPU</th>
                                            <th style={{ width: '10%' }}>Status</th>
                                            <th style={{ width: '15%' }}>Path</th>
                                            <th style={{ width: '10%' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProcesses.map((proc) => (
                                            <tr key={proc.pid}>
                                                <td><code>{proc.pid}</code></td>
                                                <td><strong>{proc.name}</strong></td>
                                                <td>
                                                    <span
                                                        className="category-badge"
                                                        style={{ backgroundColor: categoryColors[proc.category] || '#8c8c8c' }}
                                                    >
                                                        {proc.category}
                                                    </span>
                                                </td>
                                                <td className="memory-cell">{proc.memory_display}</td>
                                                <td>{proc.cpu.toFixed(1)}%</td>
                                                <td>{proc.status}</td>
                                                <td className="path-cell">{proc.exe_path}</td>
                                                <td>
                                                    <button
                                                        className="btn btn-danger btn-small"
                                                        onClick={() => handleKillProcess(proc.pid, proc.name)}
                                                    >
                                                        Kill
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

            {/* Ports Tab */}
            {activeTab === 'ports' && (
                <div className="tab-content">
                    <div className="action-bar">
                        <button
                            className="btn btn-primary"
                            onClick={handleRefreshPorts}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="spinner" style={{ width: 14, height: 14 }} />
                            ) : (
                                'Refresh'
                            )}
                        </button>
                    </div>

                    {ports.length > 0 && (
                        <div className="card">
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '15%' }}>Port</th>
                                            <th style={{ width: '15%' }}>Protocol</th>
                                            <th style={{ width: '25%' }}>Process</th>
                                            <th style={{ width: '15%' }}>PID</th>
                                            <th style={{ width: '20%' }}>State</th>
                                            <th style={{ width: '10%' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ports.map((port, idx) => (
                                            <tr key={`${port.port}-${port.protocol}-${idx}`}>
                                                <td>
                                                    <span className="port-number">{port.port}</span>
                                                </td>
                                                <td>
                                                    <span className={`protocol-badge ${port.protocol.toLowerCase()}`}>
                                                        {port.protocol}
                                                    </span>
                                                </td>
                                                <td><strong>{port.process_name}</strong></td>
                                                <td><code>{port.pid}</code></td>
                                                <td>{port.state}</td>
                                                <td>
                                                    <button
                                                        className="btn btn-danger btn-small"
                                                        onClick={() => handleKillProcess(port.pid, port.process_name)}
                                                    >
                                                        Kill
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

            <style>{`
        .view-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .view-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .tabs {
          display: flex;
          border-bottom: 1px solid var(--color-border);
        }
        .tab {
          padding: var(--spacing-sm) var(--spacing-lg);
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }
        .tab:hover {
          color: var(--color-primary);
        }
        .tab.active {
          color: var(--color-primary);
          border-bottom-color: var(--color-primary);
        }
        .tab-content {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .action-bar {
          display: flex;
          gap: var(--spacing-md);
          align-items: center;
        }
        .filter-select {
          padding: var(--spacing-sm) var(--spacing-md);
          border: 1px solid var(--color-border);
          border-radius: var(--border-radius-sm);
          background: var(--color-bg-primary);
          color: var(--color-text-primary);
        }
        .category-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          color: white;
        }
        .port-number {
          font-family: 'Consolas', monospace;
          font-weight: 600;
          color: var(--color-primary);
        }
        .protocol-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          text-transform: uppercase;
        }
        .protocol-badge.tcp {
          background: rgba(82, 196, 26, 0.2);
          color: #52c41a;
        }
        .protocol-badge.udp {
          background: rgba(24, 144, 255, 0.2);
          color: #1890ff;
        }
        .memory-cell {
          font-weight: 600;
          color: var(--color-warning);
        }
        .path-cell {
          font-family: 'Consolas', monospace;
          font-size: 11px;
          color: var(--color-text-tertiary);
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .btn-small {
          padding: 4px 8px;
          font-size: 12px;
        }
        .btn-danger {
          background: var(--color-danger);
          color: white;
        }
        .message-card {
          padding: var(--spacing-md);
        }
        .error-card {
          border-color: var(--color-danger);
          background-color: rgba(255, 77, 79, 0.1);
          color: var(--color-danger);
        }
        .success-card {
          border-color: var(--color-success);
          background-color: rgba(82, 196, 26, 0.1);
          color: var(--color-success);
        }
      `}</style>
        </div>
    );
}
