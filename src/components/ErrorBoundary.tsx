import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full space-y-6 flex flex-col items-center justify-center">
          <h1 className="text-lg font-sans font-mediun text-center">
            Oops! Something went wrong.
          </h1>
          <p className="text-gray-400 text-center text-sm">
            We're sorry for the inconvenience. Please try reloading the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full cursor-pointer text-sm flex justify-center items-center space-x-2 bg-[#FC4C02] hover:bg-[#e04402] text-white py-2 rounded-sm"
          >
            <span>Reload Page</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;