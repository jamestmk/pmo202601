import { auth } from "@/auth";

export default auth((req) => {
  const loggedIn = !!req.auth;
  const path = req.nextUrl.pathname;
  const isLogin = path.startsWith("/login");
  const isAuthApi = path.startsWith("/api/auth");

  if (isAuthApi) return;

  if (!loggedIn && !isLogin) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }
  if (loggedIn && isLogin) {
    return Response.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
