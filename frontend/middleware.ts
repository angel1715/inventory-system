import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = ["/dashboard", "/pos", "/products", "/sales", "/cash", "/expenses", "/suppliers", "/purchases"];

export function middleware(req: NextRequest) {
    const token = req.cookies.get("token")?.value;
    const subStatus = req.cookies.get("subStatus")?.value;
    const { pathname } = req.nextUrl;

    // 1. Permitir acceso libre a páginas públicas
    if (pathname === "/login" || pathname === "/pricing" || pathname === "/register") {
        // Si el usuario ya está logueado y va a login, redirigir al dashboard
        if (token && pathname === "/login") {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
        return NextResponse.next();
    }

    // 2. Si no hay token y la ruta es protegida, enviar a login
    const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
    if (isProtected && !token) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    // 3. Si tiene token pero la suscripción no es ACTIVE, forzar a /pricing
    if (token && subStatus !== "ACTIVE" && pathname !== "/pricing") {
        return NextResponse.redirect(new URL("/pricing", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$).*)",
    ],
};