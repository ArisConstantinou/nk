import {Component, type ErrorInfo, type ReactNode} from 'react';

export class ExperienceErrorBoundary extends Component<{
  children: ReactNode;
  fallback: ReactNode;
  onError: (error: Error) => void;
}, {failed: boolean}> {
  state = {failed: false};

  static getDerivedStateFromError() {
    return {failed: true};
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError(error);
    if (import.meta.env.DEV) console.error('Interactive experience render failed', error, info);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
