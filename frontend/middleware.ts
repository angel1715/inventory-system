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

  // 1. Rutas públicas (login, pricing, register)
  if (pathname === "/login" || pathname === "/pricing" || pathname === "/register") {
    // Si ya tiene token e intenta ir al login, lo mandamos al dashboard
    if (token && pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // 2. Validación de rutas protegidas
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  
  if (isProtected) {
    // Si no hay token, redirigimos al login
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      // Opcional: podrías guardar la ruta a la que intentaba acceder para redirigirlo luego
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};