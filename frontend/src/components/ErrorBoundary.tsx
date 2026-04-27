import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Keep as console output for debugging in devtools.
    // eslint-disable-next-line no-console
    console.error("UI crashed:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-full">
          <div className="mx-auto max-w-2xl px-4 py-16">
            <div className="glass rounded-3xl p-7">
              <div className="text-xl font-extrabold tracking-tight">
                Something went wrong
              </div>
              <div className="mt-2 text-sm text-slate-300">
                The UI hit an unexpected error. Use the details below to fix it.
              </div>
              <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {this.state.error.message}
              </div>
              <pre className="mt-4 overflow-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-slate-200">
                {this.state.error.stack}
              </pre>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  className="btn-primary"
                  onClick={() => window.location.reload()}
                >
                  Reload
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    localStorage.removeItem("laundry.session.v1");
                    window.location.href = "/login";
                  }}
                >
                  Clear session
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

