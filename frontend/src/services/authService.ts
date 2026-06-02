const API = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface UserOut {
  id: string;
  email: string;
  display_name: string;
  role: "admin" | "user";
  is_active: boolean;
  created_at: string;
}

export async function login(email: string, password: string): Promise<UserOut> {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(err.detail ?? "Login failed");
  }

  const data = await res.json();
  return data.user as UserOut;
}

export async function logout(): Promise<void> {
  await fetch(`${API}/api/v1/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function refreshToken(): Promise<void> {
  const res = await fetch(`${API}/api/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Session expired");
}

export async function getMe(): Promise<UserOut> {
  const res = await fetch(`${API}/api/v1/users/me`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Not authenticated");
  return res.json();
}
