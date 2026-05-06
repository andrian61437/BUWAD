import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-red-500/50 bg-red-500/10 dark:bg-red-500/20 p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <div className="text-sm font-black text-red-600 dark:text-red-400 mb-2">
            Something went wrong
          </div>
          <div className="text-[10px] font-medium text-[#4A5568] dark:text-[#94A3B8] mb-3">
            {this.state.error?.message || 'An unexpected error occurred'}
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="px-4 py-2 rounded-lg bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-colors duration-200"
          >
            TRY AGAIN
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;