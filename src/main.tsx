import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { ErrorBoundary } from "./components/common";
import { checkEnv } from "./env";
import { createQueryClient } from "./queryClient";
import { getInitialTheme, applyTheme } from "./theme";
import "./theme.css";
import "./styles.css";

applyTheme(getInitialTheme());

const envCheck = checkEnv(import.meta.env);
const queryClient = createQueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {envCheck.ok ? (
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </QueryClientProvider>
    ) : (
      <section className="card" role="alert">
        <p>{envCheck.message}</p>
      </section>
    )}
  </StrictMode>,
);
