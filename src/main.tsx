import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/common";
import { checkEnv } from "./env";
import { getInitialTheme, applyTheme } from "./theme";
import "./theme.css";
import "./styles.css";

applyTheme(getInitialTheme());

const envCheck = checkEnv(import.meta.env);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {envCheck.ok ? (
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    ) : (
      <section className="card" role="alert">
        <p>{envCheck.message}</p>
      </section>
    )}
  </StrictMode>,
);
