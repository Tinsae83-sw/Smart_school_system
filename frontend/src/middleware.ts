import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Force HTTPS on every page/route.
 *
 * On Vercel and most proxies the real protocol arrives in the
 * `x-forwarded-proto` header; if it is not https the request is re-written to
 * https with a permanent (308) redirect. Development on localhost is exempt so
 * `next dev` keeps working over http.
 */
export function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  const isLocalhost = LOCAL_HOSTS.has(hostname) || hostname.startsWith("localhost");

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProto ? forwardedProto.split(",")[0].trim() : request.nextUrl.protocol.replace(":", "");

  if (protocol === "http" && !isLocalhost) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclude Next.js internals and static assets
    "/((?!_next/static|_next/image|icons|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};