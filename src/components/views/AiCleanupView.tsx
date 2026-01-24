import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { scanAiJunk, deleteAiJunk, deleteMultipleAiJunk, AiJunkFile } from '../../ipc/commands';

export function AiCleanupView() {
    const { t } = useTranslation();
    const [junkFiles, setJunkFiles] = useState<AiJunkFile[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [scanPath, setScanPath] = useState('');
    const [scanDepth, setScanDepth] = useState(5);
    const [filterType, setFilterType] = useState<string>('all');

    const handleScan = useCallback(async () => {
        if (!scanPath.trim()) {
            setError('Please enter a directory path to scan');
            return;
        }

        setIsScanning(true);
        setError(null);
        setSuccess(null);
        setSelectedFiles(new Set());

        try {
            const files = await scanAiJunk(scanPath, scanDepth);
            setJunkFiles(files);
            if (files.length === 0) {
                setSuccess('No AI junk files found in this directory');
            }
        } catch (e) {
            setError(String(e));
        } finally {
            setIsScanning(false);
        }
    }, [scanPath, scanDepth]);

    const toggleFileSelection = (path: string) => {
        const newSelected = new Set(selectedFiles);
        if (newSelected.has(path)) {
            newSelected.delete(path);
        } else {
            newSelected.add(path);
        }
        setSelectedFiles(newSelected);
    };

    const selectAll = () => {
        setSelectedFiles(new Set(filteredFiles.map(f => f.path)));
    };

    const deselectAll = () => {
        setSelectedFiles(new Set());
    };

    const handleDeleteSelected = async () => {
        if (selectedFiles.size === 0) {
            setError('Please select at least one file to delete');
            return;
        }

        if (!confirm(t('ai_cleanup.confirm_delete', { count: selectedFiles.size }) ||
            `Are you sure you want to delete ${selectedFiles.size} files?`)) {
            return;
        }

        setIsDeleting(true);
        setError(null);
        setSuccess(null);

        try {
            const results = await deleteMultipleAiJunk([...selectedFiles]);
            const successCount = results.filter(r => r.Ok).length;
            const failCount = results.filter(r => r.Err).length;

            if (failCount > 0) {
                const errors = results.filter(r => r.Err).map(r => r.Err).slice(0, 3).join('\n');
                setError(`${failCount} failed:\n${errors}`);
            }

            if (successCount > 0) {
                setSuccess(`Successfully deleted ${successCount} files`);
            }

            // Refresh
            setSelectedFiles(new Set());
            await handleScan();
        } catch (e) {
            setError(String(e));
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteSingle = async (file: AiJunkFile) => {
        if (!confirm(`Delete ${file.name}?`)) {
            return;
        }

        setIsDeleting(true);
        setError(null);

        try {
            const result = await deleteAiJunk(file.path);
            setSuccess(result);
            await handleScan();
        } catch (e) {
            setError(String(e));
        } finally {
            setIsDeleting(false);
        }
    };

    // Filter files
    const filteredFiles = junkFiles.filter(f => {
        if (filterType === 'all') return true;
        return f.junk_type === filterType;
    });

    // Group by type
    const typeStats = junkFiles.reduce((acc, f) => {
        acc[f.junk_type] = (acc[f.junk_type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const totalSize = filteredFiles.reduce((sum, f) => sum + f.size, 0);
    const selectedSize = filteredFiles
        .filter(f => selectedFiles.has(f.path))
        .reduce((sum, f) => sum + f.size, 0);

    const formatSize = (bytes: number): string => {
        const KB = 1024;
        const MB = KB * 1024;
        const GB = MB * 1024;
        if (bytes >= GB) return `${(bytes / GB).toFixed(2)} GB`;
        if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`;
        if (bytes >= KB) return `${(bytes / KB).toFixed(2)} KB`;
        return `${bytes} B`;
    };

    const typeLabels: Record<string, string> = {
        ai_tool: 'AI Tool Files',
        temp_file: 'Temporary Files',
        anomalous: 'Anomalous Files',
    };

    return (
        <div className="view-container">
            <div className="view-header">
                <div>
                    <p className="text-secondary">{t('ai_cleanup.description')}</p>
                    {junkFiles.length > 0 && (
                        <p className="text-tertiary" style={{ marginTop: 4 }}>
                            Found {junkFiles.length} files ({formatSize(totalSize)})
                            {selectedFiles.size > 0 && (
                                <span className="badge badge-primary" style={{ marginLeft: 8 }}>
                                    {selectedFiles.size} selected ({formatSize(selectedSize)})
                                </span>
                            )}
                        </p>
                    )}
                </div>
                {selectedFiles.size > 0 && (
                    <button
                        className="btn btn-danger"
                        onClick={handleDeleteSelected}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <span className="spinner" style={{ width: 14, height: 14 }} />
                        ) : (
                            t('ai_cleanup.delete_selected')
                        )}
                    </button>
                )}
            </div>

            {/* Scan Controls */}
            <div className="card scan-controls">
                <div className="scan-row">
                    <input
                        type="text"
                        className="path-input"
                        placeholder="Enter directory path to scan (e.g., C:\Users\...)"
                        value={scanPath}
                        onChange={(e) => setScanPath(e.target.value)}
                    />
                    <select
                        className="depth-select"
                        value={scanDepth}
                        onChange={(e) => setScanDepth(Number(e.target.value))}
                    >
                        <option value={3}>Depth: 3</option>
                        <option value={5}>Depth: 5</option>
                        <option value={10}>Depth: 10</option>
                        <option value={20}>Depth: 20</option>
                    </select>
                    <button
                        className="btn btn-primary"
                        onClick={handleScan}
                        disabled={isScanning || !scanPath.trim()}
                    >
                        {isScanning ? (
                            <>
                                <span className="spinner" style={{ width: 14, height: 14 }} />
                                Scanning...
                            </>
                        ) : (
                            t('ai_cleanup.scan')
                        )}
                    </button>
                </div>
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

            {/* Filters */}
            {junkFiles.length > 0 && (
                <div className="filter-bar">
                    <div className="filter-buttons">
                        <button
                            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                            onClick={() => setFilterType('all')}
                        >
                            All ({junkFiles.length})
                        </button>
                        {Object.entries(typeStats).map(([type, count]) => (
                            <button
                                key={type}
                                className={`filter-btn ${filterType === type ? 'active' : ''}`}
                                onClick={() => setFilterType(type)}
                            >
                                {typeLabels[type] || type} ({count})
                            </button>
                        ))}
                    </div>
                    <div className="select-actions">
                        <button className="btn btn-secondary btn-small" onClick={selectAll}>
                            Select All
                        </button>
                        <button className="btn btn-secondary btn-small" onClick={deselectAll}>
                            Deselect
                        </button>
                    </div>
                </div>
            )}

            {/* Results */}
            {filteredFiles.length > 0 && (
                <div className="card">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ width: '5%' }}></th>
                                    <th style={{ width: '20%' }}>Name</th>
                                    <th style={{ width: '35%' }}>Path</th>
                                    <th style={{ width: '10%' }}>Size</th>
                                    <th style={{ width: '20%' }}>Reason</th>
                                    <th style={{ width: '10%' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFiles.map((file) => (
                                    <tr key={file.id} className={selectedFiles.has(file.path) ? 'selected-row' : ''}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedFiles.has(file.path)}
                                                onChange={() => toggleFileSelection(file.path)}
                                            />
                                        </td>
                                        <td>
                                            <strong>{file.name}</strong>
                                            <span className={`type-badge ${file.junk_type}`}>
                                                {file.junk_type}
                                            </span>
                                        </td>
                                        <td className="path-cell">{file.path}</td>
                                        <td className="size-cell">{file.size_display}</td>
                                        <td className="reason-cell">{file.reason}</td>
                                        <td>
                                            <button
                                                className="btn btn-danger btn-small"
                                                onClick={() => handleDeleteSingle(file)}
                                                disabled={isDeleting}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
        .scan-controls {
          padding: var(--spacing-md);
        }
        .scan-row {
          display: flex;
          gap: var(--spacing-md);
          align-items: center;
          flex-wrap: wrap;
        }
        .path-input {
          flex: 1;
          min-width: 300px;
          padding: var(--spacing-sm) var(--spacing-md);
          border: 1px solid var(--color-border);
          border-radius: var(--border-radius-sm);
          background: var(--color-bg-primary);
          color: var(--color-text-primary);
          font-size: var(--font-size-sm);
        }
        .depth-select {
          padding: var(--spacing-sm) var(--spacing-md);
          border: 1px solid var(--color-border);
          border-radius: var(--border-radius-sm);
          background: var(--color-bg-primary);
          color: var(--color-text-primary);
        }
        .filter-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: var(--spacing-md);
        }
        .filter-buttons {
          display: flex;
          gap: var(--spacing-xs);
          flex-wrap: wrap;
        }
        .filter-btn {
          padding: var(--spacing-xs) var(--spacing-md);
          border: 1px solid var(--color-border);
          border-radius: var(--border-radius-sm);
          background: var(--color-bg-secondary);
          color: var(--color-text-secondary);
          cursor: pointer;
          font-size: var(--font-size-sm);
        }
        .filter-btn.active {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }
        .select-actions {
          display: flex;
          gap: var(--spacing-sm);
        }
        .path-cell {
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 11px;
          color: var(--color-text-secondary);
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .size-cell {
          font-weight: 600;
          color: var(--color-warning);
        }
        .reason-cell {
          font-size: 12px;
          color: var(--color-text-tertiary);
        }
        .type-badge {
          display: inline-block;
          margin-left: 8px;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          text-transform: uppercase;
        }
        .type-badge.ai_tool {
          background: rgba(114, 46, 209, 0.2);
          color: #722ed1;
        }
        .type-badge.temp_file {
          background: rgba(250, 173, 20, 0.2);
          color: #faad14;
        }
        .type-badge.anomalous {
          background: rgba(255, 77, 79, 0.2);
          color: #ff4d4f;
        }
        .selected-row {
          background: rgba(24, 144, 255, 0.1) !important;
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
