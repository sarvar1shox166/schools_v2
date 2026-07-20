import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { ErrorToastHost } from "./components/ErrorToast.js";
import { showError, extractErrorMessage } from "./lib/errorToast.js";
import { initSentry, captureError } from "./lib/sentry.js";
import "@chess-school/ui";

initSentry();

export const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      onError: (err) => {
        captureError(err);
        const message = extractErrorMessage(err);
        if (message) showError(message);
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <ErrorToastHost />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
