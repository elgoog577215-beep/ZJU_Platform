import React from 'react';
import { Home, RefreshCw, AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI can be customized via props
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Silent mode: Render nothing (invisible failure)
      // This is useful for non-critical components (decorations, widgets) where
      // an empty space is better than a red error box.
      if (this.props.silent) {
        return null;
      }

      // Small inline fallback for minor components
      if (this.props.variant === 'inline') {
        return null; // Force inline errors to be silent by default as requested
      }

      // Default Full Page Error
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6 text-center z-[100] relative">
            <h1 className="text-4xl font-bold font-serif text-red-500 mb-4">Something went wrong</h1>
            <p className="text-gray-400 max-w-md mb-8">
                The application encountered an error but has attempted to contain it.
            </p>
            {this.state.error && (
                <div className="bg-white/5 border border-white/10 p-4 rounded-lg text-left text-xs font-mono text-red-300 max-w-2xl overflow-auto mb-8 w-full max-h-48">
                    {this.state.error.toString()}
                </div>
            )}
            
            <div className="flex gap-4">
                <button 
                    onClick={() => {
                        this.handleReset();
                        // Optional: Navigate to home if critical
                        // window.location.href = '/'; 
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-full transition-colors font-bold"
                >
                    <RefreshCw size={20} />
                    Try Again
                </button>
                <button 
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors font-bold"
                >
                    <RefreshCw size={20} />
                    Force Reload
                </button>
            </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;