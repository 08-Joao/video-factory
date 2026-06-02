"use client";

import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("vf_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function fileUrl(path?: string) {
  return path ? `${API_URL}/files/${path}` : "";
}
