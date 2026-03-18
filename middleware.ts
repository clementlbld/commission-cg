import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;

  if (!req.auth && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (req.auth && pathname === "/login") {
    if (role === "COMPTA") return NextResponse.redirect(new URL("/compta/dashboard", req.url));
    if (role === "SETTER") return NextResponse.redirect(new URL("/setter/dashboard", req.url));
    return NextResponse.redirect(new URL("/closer/dashboard", req.url));
  }

  if (pathname.startsWith("/compta") && role !== "COMPTA") {
    return NextResponse.redirect(new URL("/closer/dashboard", req.url));
  }

  if (pathname.startsWith("/closer") && role !== "CLOSER") {
    if (role === "SETTER") return NextResponse.redirect(new URL("/setter/dashboard", req.url));
    return NextResponse.redirect(new URL("/compta/dashboard", req.url));
  }

  if (pathname.startsWith("/setter") && role !== "SETTER") {
    if (role === "COMPTA") return NextResponse.redirect(new URL("/compta/dashboard", req.url));
    return NextResponse.redirect(new URL("/closer/dashboard", req.url));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
