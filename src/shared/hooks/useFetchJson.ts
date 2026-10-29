import { useState, useEffect } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON de configuração das páginas não tem contrato tipado
type JsonConfig = Record<string, any>;

interface UseFetchJsonReturnType {
  data: JsonConfig | null;
  isLoading: boolean;
}

const useFetchJson = (url: string): UseFetchJsonReturnType => {
  const [data, setData] = useState<JsonConfig | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(url);
        const jsonData = await response.json();
        setData(jsonData);
      } catch (error) {
        console.error(`Erro ao carregar ${url}`, error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, isLoading };
};

export default useFetchJson;
