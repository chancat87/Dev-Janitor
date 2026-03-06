import React, { Component, Suspense, lazy } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useAppStore } from './store';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import './styles/index.css';

// Lazy load views for better performance
const ToolsView = lazy(() => import('./components/views/ToolsView').then(m => ({ default: m.ToolsView })));
const SettingsView = lazy(() => import('./components/views/SettingsView').then(m => ({ default: m.SettingsView })));
const PackagesView = lazy(() => import('./components/views/PackagesView').then(m => ({ default: m.PackagesView })));
const CacheView = lazy(() => import('./components/views/CacheView').then(m => ({ default: m.CacheView })));
const AiCleanupView = lazy(() => import('./components/views/AiCleanupView').then(m => ({ default: m.AiCleanupView })));
const ChatHistoryView = lazy(() => import('./components/views/ChatHistoryView').then(m => ({ default: m.ChatHistoryView })));
const ServicesView = lazy(() => import('./components/views/ServicesView').then(m => ({ default: m.ServicesView })));
const ConfigView = lazy(() => import('./components/views/ConfigView').then(m => ({ default: m.ConfigView })));
const AiCliView = lazy(() => import('./components/views/AiCliView').then(m => ({ default: m.AiCliView })));
const SecurityScanView = lazy(() => import('./components/views/SecurityScanView').then(m => ({ default: m.SecurityScanView })));

function LoadingFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }} aria-label="Loading">
      <div className="spinner" />
    </div>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('View crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, textAlign: 'center' }}>
          <h2 style={{ color: 'var(--color-danger)' }}>Something went wrong</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>
            {this.state.error?.message}
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function CurrentView() {
  const currentView = useAppStore((state) => state.currentView);

  const viewComponents: Record<string, React.LazyExoticComponent<() => React.ReactElement>> = {
    tools: ToolsView,
    packages: PackagesView,
    cache: CacheView,
    ai_cleanup: AiCleanupView,
    chat_history: ChatHistoryView,
    services: ServicesView,
    config: ConfigView,
    ai_cli: AiCliView,
    security_scan: SecurityScanView,
    settings: SettingsView,
  };

  const ViewComponent = viewComponents[currentView] ?? ToolsView;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <ViewComponent />
    </Suspense>
  );
}

function App() {
  const currentView = useAppStore((state) => state.currentView);

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Header />
        <div className="content-area">
          <ErrorBoundary key={currentView}>
            <CurrentView />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export default App;
