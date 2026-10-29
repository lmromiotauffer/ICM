import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./index.css";
import App, { type ConnectionConfig } from "./App.tsx";

// =============================================================================
// Utilitários
// =============================================================================

/**
 * Gera a URL base do Qlik a partir da configuração de conexão
 */
function buildQlikBaseUrl(config: ConnectionConfig): string {
  const protocol = config.isSecure ? "https" : "http";
  const defaultPort = config.isSecure ? 443 : 80;
  const portSuffix = config.port !== defaultPort ? `:${config.port}` : "";
  return `${protocol}://${config.host}${portSuffix}`;
}

/**
 * Carrega a configuração de conexão do arquivo connection.json
 */
async function loadConnectionConfig(): Promise<ConnectionConfig> {
  const response = await fetch("./connection.json");
  if (!response.ok) {
    throw new Error(
      `Falha ao carregar connection.json: ${response.status} ${response.statusText}`,
    );
  }
  return response.json();
}

// =============================================================================
// Fetch Interceptor
// =============================================================================

/**
 * Configura o interceptor de fetch para corrigir URLs de recursos Qlik
 */
function setupFetchInterceptor(qlikBaseUrl: string, debugMode: boolean): void {
  const log = (msg: string, ...optionalParams: unknown[]) => {
    if (debugMode) {
      console.log(`[Fetch Interceptor] ${msg}`, ...optionalParams);
    }
  };

  log("Setting up fetch interceptor with base URL:", qlikBaseUrl);

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    log("Request:", { input, init });

    let url: string;
    if (typeof input === "string") {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else {
      // Request object
      url = input.url;
    }
    log("Parsed URL:", url);

    // A URL relativa ../resources/qmfe/import-map.json é resolvida pelo navegador para
    // /extensions/icm/resources/qmfe/import-map.json, mas o arquivo está em /resources/qmfe/import-map.json
    if (url.includes("../resources")) {
      const fixedUrl = url.replace("../resources", `${qlikBaseUrl}/resources`);
      log("Redirecting request to:", fixedUrl);

      // Se for o import-map.json, interceptamos a resposta e corrigimos as URLs internas
      if (url.includes("import-map.json")) {
        log("Intercepting import-map.json response to fix internal URLs");
        const response = await originalFetch(fixedUrl, init);

        if (response.ok) {
          const originalText = await response.text();
          log(
            "Original import-map content:",
            originalText.substring(0, 500) + "...",
          );

          // Corrige URLs relativas que começam com "../" para URLs absolutas
          // Exemplo: "../resources/qmfe/external/..." -> "https://host/resources/qmfe/external/..."
          const fixedText = originalText.replace(
            /"\.\.\/(resources\/[^"]+)"/g,
            `"${qlikBaseUrl}/$1"`,
          );
          log(
            "Fixed import-map content:",
            fixedText.substring(0, 500) + "...",
          );

          // Retorna uma nova Response com o conteúdo modificado
          return new Response(fixedText, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }

        return response;
      }

      return originalFetch(fixedUrl, init);
    }

    // Também corrige URLs que já foram resolvidas incorretamente pelo navegador
    // Ex: /extensions/resources/qmfe/... -> /resources/qmfe/...
    if (url.includes("/extensions/resources/")) {
      const fixedUrl = url.replace(
        "/extensions/resources/",
        `${qlikBaseUrl}/resources/`,
      );
      log("Fixing incorrectly resolved URL:", url, "->", fixedUrl);
      return originalFetch(fixedUrl, init);
    }

    log("No redirection applied. Proceeding with original request.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return originalFetch(input as any, init);
  };
}

// =============================================================================
// Inicialização
// =============================================================================

async function bootstrap(): Promise<void> {
  try {
    // 1. Carrega a configuração de conexão
    const connectionConfig = await loadConnectionConfig();

    // 2. Configura o interceptor de fetch com a URL base dinâmica
    setupFetchInterceptor(
      buildQlikBaseUrl(connectionConfig),
      connectionConfig.debugMode || false,
    );

    // 3. Renderiza a aplicação
    createRoot(document.getElementById("root")!).render(
      <App config={connectionConfig} />,
    );
  } catch (error) {
    console.error("[Bootstrap] Failed to initialize application:", error);
    // Renderiza uma mensagem de erro básica
    const root = document.getElementById("root");
    if (root) {
      root.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif;">
          <div style="text-align: center;">
            <h1>Erro ao inicializar aplicação</h1>
            <p>Não foi possível carregar a configuração de conexão.</p>
            <pre style="text-align: left; background: #f5f5f5; padding: 1rem; border-radius: 4px;">${error}</pre>
          </div>
        </div>
      `;
    }
  }
}

// Inicia a aplicação
bootstrap();
