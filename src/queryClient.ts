import { QueryClient } from "@tanstack/react-query";

export function createQueryClient(retry: number | false = 1) {
  return new QueryClient({
    defaultOptions: {
      queries: { retry, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}
