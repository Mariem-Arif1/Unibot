import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

const PUBLIC_PATHS = ["/login", "/api", "/_next", "/favicon.ico"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const accessToken = request.cookies.get("aivora_access")?.value;

  if (!accessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Lightweight client-side expiry check (not authoritative — backend validates)
  try {
    const payload = jwtDecode<{ exp: number; role: string }>(accessToken);

    if (pathname.startsWith("/admin") && payload.role !== "admin") {
      return NextResponse.redirect(new URL("/bots", request.url));
    }
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp - now < 60) {
      // Token expires within 60 s — attempt silent refresh
      const refreshUrl = new URL("/api/v1/auth/refresh", request.url);
      const refreshRes = await fetch(refreshUrl.toString(), {
        method: "POST",
        headers: { Cookie: request.headers.get("cookie") ?? "" },
      });
      if (!refreshRes.ok) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
      }
      // Forward the new Set-Cookie from refresh to the browser
      const response = NextResponse.next();
      refreshRes.headers.getSetCookie?.()?.forEach((cookie) => {
        response.headers.append("Set-Cookie", cookie);
      });
      return response;
    }
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
};
