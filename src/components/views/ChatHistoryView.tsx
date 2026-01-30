import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';

// Types for chat history
interface ChatHistoryFile {
    id: string;
    name: string;
    path: string;
    size: number;
    size_display: string;
    ai_tool: string;
    file_type: string;
    is_directory: boolean;
}

interface ProjectChatHistory {
    id: string;
    name: string;
    project_path: string;
    chat_files: ChatHistoryFile[];
    total_size: number;
    total_size_display: string;
    ai_tools_detected: string[];
}

export function ChatHistoryView() {
    const { t } = useTranslation();

    // Local state (will migrate to global store if needed)
    const [projects, setProjects] = useState<ProjectChatHistory[]>([]);
    const [globalFiles, setGlobalFiles] = useState<ChatHistoryFile[]>([]);
    const [scanPath, setScanPath] = useState('');
    const [scanDepth, setScanDepth] = useState(3);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
    const [isScanning, setIsScanning] = useState(false);
    const [activeTab, setActiveTab] = useState<'projects' | 'global'>('projects');
    const [error, setError] = useState<string | null>(null);

    // Calculate totals
    const totalProjectSize = projects.reduce((sum, p) => sum + p.total_size, 0);
    const totalGlobalSize = globalFiles.reduce((sum, f) => sum + f.size, 0);
    const selectedFilesArray = Array.from(selectedFiles);
    const selectedSize = projects
        .flatMap(p => p.chat_files)
        .filter(f => selectedFiles.has(f.path))
        .reduce((sum, f) => sum + f.size, 0)
        + globalFiles
            .filter(f => selectedFiles.has(f.path))
            .reduce((sum, f) => sum + f.size, 0);

    // Format size helper
    const formatSize = (bytes: number): string => {
        if (bytes >= 1024 * 1024 * 1024) {
            return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        } else if (bytes >= 1024 * 1024) {
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        } else if (bytes >= 1024) {
            return `${(bytes / 1024).toFixed(2)} KB`;
        }
        return `${bytes} B`;
    };

    // Scan for projects with chat history
    const handleScanProjects = async () => {
        if (!scanPath.trim()) {
            setError(t('chat_history.error_no_path'));
            return;
        }

        setIsScanning(true);
        setError(null);
        setSelectedFiles(new Set());
        setExpandedProjects(new Set());
        try {
            const result = await invoke<ProjectChatHistory[]>('scan_chat_history_cmd', {
                path: scanPath,
                max_depth: scanDepth,
            });
            setProjects(result);
        } catch (e) {
            setError(String(e));
        } finally {
            setIsScanning(false);
        }
    };

    // Scan global AI directories
    const handleScanGlobal = async () => {
        setIsScanning(true);
        setError(null);
        setSelectedFiles(new Set());
        try {
            const result = await invoke<ChatHistoryFile[]>('scan_global_chat_history_cmd');
            setGlobalFiles(result);
        } catch (e) {
            setError(String(e));
        } finally {
            setIsScanning(false);
        }
    };

    // Toggle project expansion
    const toggleProject = (projectId: string) => {
        setExpandedProjects(prev => {
            const next = new Set(prev);
            if (next.has(projectId)) {
                next.delete(projectId);
            } else {
                next.add(projectId);
            }
            return next;
        });
    };

    // Toggle file selection
    const toggleFileSelection = (path: string) => {
        setSelectedFiles(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    // Select all files in a project
    const selectAllInProject = (project: ProjectChatHistory) => {
        setSelectedFiles(prev => {
            const next = new Set(prev);
            const allSelected = project.chat_files.every(f => prev.has(f.path));
            if (allSelected) {
                project.chat_files.forEach(f => next.delete(f.path));
            } else {
                project.chat_files.forEach(f => next.add(f.path));
            }
            return next;
        });
    };

    // Delete selected files
    const handleDeleteSelected = async () => {
        if (selectedFiles.size === 0) {
            setError(t('chat_history.error_no_selection'));
            return;
        }

        const confirmMessage = t('chat_history.confirm_delete', {
            count: selectedFiles.size,
            size: formatSize(selectedSize),
        });

        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            const result = await invoke<[number, number, string[]]>('delete_multiple_chat_files', {
                paths: selectedFilesArray,
            });
            const [success, fail, errors] = result;

            if (success > 0) {
                // Refresh data
                if (activeTab === 'projects') {
                    await handleScanProjects();
                } else {
                    await handleScanGlobal();
                }
                setSelectedFiles(new Set());
            }

            if (fail > 0) {
                setError(t('chat_history.partial_failed', {
                    count: fail,
                    errors: errors.slice(0, 3).join('\n'),
                }));
            }
        } catch (e) {
            setError(String(e));
        }
    };

    // Delete single file
    const handleDeleteFile = async (file: ChatHistoryFile) => {
        const confirmMessage = t('chat_history.confirm_delete_single', {
            name: file.name,
            size: file.size_display,
        });

        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            await invoke<string>('delete_chat_file_cmd', { path: file.path });

            // Refresh data
            if (activeTab === 'projects') {
                await handleScanProjects();
            } else {
                await handleScanGlobal();
            }
        } catch (e) {
            setError(String(e));
        }
    };

    // Get file type badge color
    const getFileTypeBadgeClass = (fileType: string): string => {
        switch (fileType) {
            case 'chat_history':
                return 'badge-primary';
            case 'cache':
                return 'badge-warning';
            case 'debug':
                return 'badge-secondary';
            case 'global_config':
                return 'badge-info';
            default:
                return 'badge-secondary';
        }
    };

    // Get AI tool badge color
    const getToolBadgeClass = (tool: string): string => {
        const colors: Record<string, string> = {
            'Claude Code': 'badge-primary',
            'OpenAI Codex': 'badge-success',
            'OpenCode': 'badge-primary',
            'Gemini CLI': 'badge-warning',
            'Aider': 'badge-info',
            'Cursor': 'badge-secondary',
            'Continue': 'badge-primary',
            'Cody': 'badge-success',
        };
        return colors[tool] || 'badge-secondary';
    };

    return (
        <div className="view-container chat-history-view">
            <header className="view-header">
                <div>
                    <h1>{t('chat_history.title')}</h1>
                    <p className="view-description">{t('chat_history.description')}</p>
                </div>
            </header>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'projects' ? 'active' : ''}`}
                    onClick={() => setActiveTab('projects')}
                >
                    {t('chat_history.tab_projects')}
                </button>
                <button
                    className={`tab ${activeTab === 'global' ? 'active' : ''}`}
                    onClick={() => setActiveTab('global')}
                >
                    {t('chat_history.tab_global')}
                </button>
            </div>

            {/* Error display */}
            {error && (
                <div className="error-message" onClick={() => setError(null)}>
                    {error}
                </div>
            )}

            {/* Projects Tab */}
            {activeTab === 'projects' && (
                <>
                    {/* Scan controls */}
                    <div className="scan-controls">
                        <input
                            type="text"
                            value={scanPath}
                            onChange={(e) => setScanPath(e.target.value)}
                            placeholder={t('chat_history.scan_placeholder')}
                            className="path-input"
                        />
                        <select
                            value={scanDepth}
                            onChange={(e) => setScanDepth(Number(e.target.value))}
                            className="select"
                        >
                            {[2, 3, 4, 5, 6].map(d => (
                                <option key={d} value={d}>
                                    {t('chat_history.depth_option', { depth: d })}
                                </option>
                            ))}
                        </select>
                        <button
                            className="btn btn-primary"
                            onClick={handleScanProjects}
                            disabled={isScanning}
                        >
                            {isScanning ? t('chat_history.scanning') : t('chat_history.scan')}
                        </button>
                    </div>

                    {/* Summary */}
                    {projects.length > 0 && (
                        <div className="summary-bar">
                            <span>{t('chat_history.found_summary', {
                                count: projects.length,
                                size: formatSize(totalProjectSize),
                            })}</span>
                            {selectedFiles.size > 0 && (
                                <span className="selected-info">
                                    {t('chat_history.selected_summary', {
                                        count: selectedFiles.size,
                                        size: formatSize(selectedSize),
                                    })}
                                </span>
                            )}
                            {selectedFiles.size > 0 && (
                                <button
                                    className="btn btn-danger"
                                    onClick={handleDeleteSelected}
                                >
                                    {t('chat_history.delete_selected')}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Projects list */}
                    <div className="projects-list">
                        {projects.length === 0 && !isScanning && (
                            <div className="empty-state">
                                {t('chat_history.empty_result')}
                            </div>
                        )}

                        {projects.map(project => (
                            <div key={project.id} className="project-card">
                                <div
                                    className="project-header"
                                    onClick={() => toggleProject(project.id)}
                                >
                                    <div className="project-info">
                                        <span className="expand-icon">
                                            {expandedProjects.has(project.id) ? '-' : '+'}
                                        </span>
                                        <span className="project-name">{project.name}</span>
                                        <span className="project-size">{project.total_size_display}</span>
                                    </div>
                                    <div className="project-tools">
                                        {project.ai_tools_detected.map(tool => (
                                            <span
                                                key={tool}
                                                className={`badge ${getToolBadgeClass(tool)}`}
                                            >
                                                {tool}
                                            </span>
                                        ))}
                                    </div>
                                    <button
                                        className="btn btn-small btn-secondary"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            selectAllInProject(project);
                                        }}
                                    >
                                        {project.chat_files.every(f => selectedFiles.has(f.path))
                                            ? t('common.deselect_all')
                                            : t('common.select_all')}
                                    </button>
                                </div>

                                {expandedProjects.has(project.id) && (
                                    <div className="project-files">
                                        <div className="project-path">{project.project_path}</div>
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '40px' }}></th>
                                                    <th>{t('chat_history.filename')}</th>
                                                    <th>{t('chat_history.ai_tool')}</th>
                                                    <th>{t('chat_history.type')}</th>
                                                    <th>{t('chat_history.size')}</th>
                                                    <th style={{ width: '80px' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {project.chat_files.map(file => (
                                                    <tr key={file.id}>
                                                        <td>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedFiles.has(file.path)}
                                                                onChange={() => toggleFileSelection(file.path)}
                                                            />
                                                        </td>
                                                        <td>
                                                            {file.is_directory ? '[DIR]' : '[FILE]'} {file.name}
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${getToolBadgeClass(file.ai_tool)}`}>
                                                                {file.ai_tool}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${getFileTypeBadgeClass(file.file_type)}`}>
                                                                {t(`chat_history.file_types.${file.file_type}`)}
                                                            </span>
                                                        </td>
                                                        <td>{file.size_display}</td>
                                                        <td>
                                                            <button
                                                                className="btn btn-small btn-danger"
                                                                onClick={() => handleDeleteFile(file)}
                                                            >
                                                                {t('chat_history.delete')}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Global Tab */}
            {activeTab === 'global' && (
                <>
                    <div className="scan-controls">
                        <button
                            className="btn btn-primary"
                            onClick={handleScanGlobal}
                            disabled={isScanning}
                        >
                            {isScanning ? t('chat_history.scanning') : t('chat_history.scan_global')}
                        </button>
                    </div>

                    {/* Summary */}
                    {globalFiles.length > 0 && (
                        <div className="summary-bar">
                            <span>{t('chat_history.global_summary', {
                                count: globalFiles.length,
                                size: formatSize(totalGlobalSize),
                            })}</span>
                            {selectedFiles.size > 0 && (
                                <>
                                    <span className="selected-info">
                                        {t('chat_history.selected_summary', {
                                            count: selectedFiles.size,
                                            size: formatSize(selectedSize),
                                        })}
                                    </span>
                                    <button
                                        className="btn btn-danger"
                                        onClick={handleDeleteSelected}
                                    >
                                        {t('chat_history.delete_selected')}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Global files table */}
                    {globalFiles.length > 0 ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}></th>
                                    <th>{t('chat_history.filename')}</th>
                                    <th>{t('chat_history.ai_tool')}</th>
                                    <th>{t('chat_history.size')}</th>
                                    <th>{t('chat_history.path')}</th>
                                    <th style={{ width: '80px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {globalFiles.map(file => (
                                    <tr key={file.id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedFiles.has(file.path)}
                                                onChange={() => toggleFileSelection(file.path)}
                                            />
                                        </td>
                                        <td>{file.is_directory ? '[DIR]' : '[FILE]'} {file.name}</td>
                                        <td>
                                            <span className={`badge ${getToolBadgeClass(file.ai_tool)}`}>
                                                {file.ai_tool}
                                            </span>
                                        </td>
                                        <td>{file.size_display}</td>
                                        <td className="path-cell">{file.path}</td>
                                        <td>
                                            <button
                                                className="btn btn-small btn-danger"
                                                onClick={() => handleDeleteFile(file)}
                                            >
                                                {t('chat_history.delete')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="empty-state">
                            {isScanning ? t('chat_history.scanning') : t('chat_history.click_scan_global')}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
