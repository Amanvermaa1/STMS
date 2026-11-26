import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const api = axios.create({ baseURL: '/api', withCredentials: true });

let refreshPromise: Promise<unknown> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const isAuthRequest = original?.url?.includes('/auth/');

    if (error.response?.status === 401 && original && !original._retry && !isAuthRequest) {
      original._retry = true;
      refreshPromise ??= api.post('/auth/refresh').finally(() => {
        refreshPromise = null;
      });
      try {
        await refreshPromise;
        return api.request(original);
      } catch {
        // Fall through with the original 401 so the UI can redirect to login.
      }
    }

    throw error;
  },
);

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: { message?: string } } | undefined;
    return data?.error?.message ?? error.message ?? 'Request failed';
  }
  return 'Something went wrong';
}

export default api;
