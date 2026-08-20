import { QueryClient } from "@tanstack/react-query";
import { showError, extractErrorMessage } from "./errorToast.js";
import { captureError } from "./sentry.js";

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
