import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  userId?: string;
};

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;

export const api = axios.create({ baseURL: API_URL });

const useWebStorage = process.env.EXPO_OS === "web";

async function getSessionItem(key: string) {
  if (useWebStorage && typeof localStorage !== "undefined") return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function setSessionItem(key: string, value: string) {
  if (useWebStorage && typeof localStorage !== "undefined") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteSessionItem(key: string) {
  if (useWebStorage && typeof localStorage !== "undefined") {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getDeviceId() {
  const existing = await getSessionItem("device_id");
  if (existing) return existing;
  const deviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await setSessionItem("device_id", deviceId);
  return deviceId;
}

export async function saveSession(accessToken: string, refreshToken: string, userId?: string) {
  await setSessionItem("access_token", accessToken);
  await setSessionItem("refresh_token", refreshToken);
  await setSessionItem("accessToken", accessToken);
  await setSessionItem("refreshToken", refreshToken);
  if (userId) {
    await setSessionItem("user_id", userId);
    await setSessionItem("userId", userId);
  }
}

export async function clearSession() {
  await Promise.all([
    deleteSessionItem("access_token"),
    deleteSessionItem("refresh_token"),
    deleteSessionItem("user_id"),
    deleteSessionItem("accessToken"),
    deleteSessionItem("refreshToken"),
    deleteSessionItem("userId")
  ]);
}

export async function getAccessToken() {
  return (await getSessionItem("access_token")) ?? (await getSessionItem("accessToken"));
}

export async function getRefreshToken() {
  return (await getSessionItem("refresh_token")) ?? (await getSessionItem("refreshToken"));
}

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;
      const deviceId = await getDeviceId();
      const response = await axios.post<AuthResponse>(`${API_URL}/auth/refresh`, { refreshToken, deviceId });
      await saveSession(response.data.accessToken, response.data.refreshToken, response.data.userId);
      return response.data.accessToken;
    })().catch(async () => {
      await clearSession();
      return null;
    }).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableRequestConfig | undefined;
    if (error.response?.status === 401 && original && !original._retry && !original.url?.includes("/auth/refresh")) {
      original._retry = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers.set("Authorization", `Bearer ${token}`);
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toLowerCase();
  const config: AxiosRequestConfig = {
    url: path,
    method,
    data: init.body ? JSON.parse(String(init.body)) : undefined,
    headers: init.headers as AxiosRequestConfig["headers"]
  };
  const response = await api.request<T>(config);
  return response.data;
}
