import Routes from "./routes";
import { HashRouter } from "react-router-dom";
import { QlikSelectionsProvider } from "@cluster-data-experience/qlik-modules";
import { QlikProvider } from "@cluster-data-experience/qlik-modules";
import { ThemeProvider } from "./shared/contexts/ThemeContext";

export type ConnectionConfig = {
  host: string;
  isSecure: boolean;
  port: number;
  webIntegrationId?: string;
  prefix: string;
  appId: string;
  debugMode?: boolean;
};

function App({ config }: { config: ConnectionConfig }) {
  const { debugMode = false, ...qlikConfig } = config;

  return (
    <ThemeProvider>
      <QlikProvider config={qlikConfig} debugMode={debugMode}>
        <QlikSelectionsProvider>
          <HashRouter>
            <Routes />
          </HashRouter>
        </QlikSelectionsProvider>
      </QlikProvider>
    </ThemeProvider>
  );
}

export default App;
