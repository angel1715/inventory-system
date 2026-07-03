import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = ["/dashboard", "/pos", "/products", "/sales", "/cash", "/expenses", "/suppliers", "/purchases"];

export function middleware(req: NextRequest) {
    const token = req.cookies.get("token")?.value;
    const { pathname } = req.nextUrl;

    // 1. Acceso a páginas públicas
    if (pathname === "/login" || pathname === "/pricing" || pathname === "/register") {
        if (token && pathname === "/login") {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
        return NextResponse.next();
    }

    // 2. Si no hay token en rutas protegidas, al login
    const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
    if (isProtected && !token) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    // 3. ELIMINAMOS LA VALIDACIÓN DE SUSCRIPCIÓN DEL MIDDLEWARE
    // La suscripción debe ser validada en el cliente (SubscriptionGuard) 
    // porque el cliente es el que tiene la lógica reactiva y la conexión al AuthContext.

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$).*)"],
};