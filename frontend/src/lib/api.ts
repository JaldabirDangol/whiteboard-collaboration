// src/lib/api.ts
import { apiUrl } from "@/constant";
export async function signup(email: string, password: string) {
  const res = await fetch(`${apiUrl}/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error("Signup failed");
  }

  return res.json();
}

export async function login(email: string, password: string) {
  const res = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error("Login failed");
  }

  return res.json();
}


export async function getMe() {
  const res = await fetch(`${apiUrl}/auth/me`, {
    credentials: "include",
  });

  if (!res.ok) return null;

  return res.json();
}