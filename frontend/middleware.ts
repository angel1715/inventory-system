import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = [
    "/dashboard",
    "/pos",
    "/products",
    "/sales",
    "/cash",
    "/expenses",
    "/suppliers",
    "/purchases",
];

export function middleware(req: NextRequest) {
    const token = req.cookies.get("token")?.value;
    const { pathname } = req.nextUrl;

    const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

    // Si intentas entrar a una protegida y NO tienes token, vete al login
    if (isProtected && !token) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    // Si ya tienes token y estás en login/register, vete al dashboard
    // Si ya tienes token y estás en login, vete al dashboard. 
    // (Quitamos /register para que no te redirija si eres admin y quieres registrar a alguien más)
    if (token && pathname === "/login") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/pos/:path*",
        "/products/:path*",
        "/sales/:path*",
        "/cash/:path*",
        "/expenses/:path*",
        "/suppliers/:path*",
        "/purchases/:path*",
        "/login",
        "/register",
    ],
};