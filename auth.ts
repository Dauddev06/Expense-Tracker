// NextAuth (Auth.js v5) setup. We answer a few questions here, and NextAuth
// gives us 4 tools back:
//   handlers -> its own login/logout URLs (connected in app/api/auth/[...nextauth]/route.ts)
//   auth     -> "who is logged in?" on the server (used by lib/session.ts)
//   signIn / signOut -> server versions (our forms use the ones in next-auth/react)
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyCredentials } from "@/lib/services/user.service";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // "jwt" = the login lives INSIDE the cookie, sealed with AUTH_SECRET, so
  // checking it needs no database query. (Credentials logins only work with
  // "jwt".) 7 days, renewed while the user keeps using the app.
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },

  // When NextAuth needs a login page, use OUR /login, not its built-in one.
  pages: { signIn: "/login" },

  providers: [
    // Email + password, checked against our own users table.
    Credentials({
      // The fields our login form sends.
      credentials: { email: {}, password: {} },

      // Return the user -> logged in. Return null -> "wrong email or password".
      async authorize(credentials) {
        // Never trust the browser: check the types ourselves.
        const email = typeof credentials?.email === "string" ? credentials.email : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        return verifyCredentials(email, password); // { id, name, email } or null
      },
    }),
  ],

  callbacks: {
    // At login NextAuth stores the user's id in the token as `sub`, but leaves
    // it out of the session that auth() returns. Our services need the id
    // (listSpendings(user.id)...), so copy it across.
    session({ session, token }) {
      if (token.sub && session.user) session.user.id = token.sub;
      return session;
    },
  },
});
