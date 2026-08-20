import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { ErrorToastHost } from "./components/ErrorToast.js";
import { initSentry } from "./lib/sentry.js";
import { queryClient } from "./lib/queryClient.js";
import "@chess-school/ui";

initSentry();

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
