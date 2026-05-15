import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="rounded-full bg-destructive/10 p-3 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {this.state.error.message || 'An unexpected error occurred while rendering this page.'}
        </p>
        <div className="flex gap-2">
          <Button onClick={this.reset} variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" /> Try again
          </Button>
          <Button onClick={() => window.location.assign('/')}>Back to home</Button>
        </div>
        {import.meta.env.DEV && (
          <pre className="mt-4 max-w-2xl overflow-auto rounded-lg bg-muted p-4 text-left text-xs">
            {this.state.error.stack}
          </pre>
        )}
      </div>
    );
  }
}
