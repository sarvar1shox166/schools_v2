import { Component, type ReactNode } from "react";
import { captureError } from "../lib/sentry.js";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Kutilmagan xatolik:", error);
    captureError(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center",
        }}>
          <div style={{ fontSize: 42 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Nimadir xato ketdi</div>
          <div style={{ fontSize: 14, color: "#888", maxWidth: 360 }}>
            Sahifada kutilmagan xatolik yuz berdi. Sahifani yangilab ko'ring.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#3F8CFF", color: "#fff", fontWeight: 700, cursor: "pointer" }}
          >
            Sahifani yangilash
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
