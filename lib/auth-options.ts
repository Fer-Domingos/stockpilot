import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const authOptions: NextAuthOptions = {

  providers: [

    CredentialsProvider({
      id: "credentials",
      name: "Credentials",

      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {

        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          return null;
        }

        if (!user.isActive) {
          return null;
        }

        const valid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };

      },
    }),



    CredentialsProvider({
      id: "magic-link",
      name: "Magic Link",

      credentials: {
        token: { label: "Token", type: "text" },
      },

      async authorize(credentials) {

        if (!credentials?.token) return null;

        try {

          const decoded = jwt.verify(
            credentials.token,
            process.env.NEXTAUTH_SECRET!
          ) as any;

          const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
          });

          if (!user) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };

        } catch {

          return null;

        }

      },

    }),

  ],



  session: {

    strategy: "jwt",

    maxAge: 30 * 24 * 60 * 60,

  },



  debug: true,



  useSecureCookies: false,



  cookies: {

    sessionToken: {

      name: "next-auth.session-token",

      options: {

        httpOnly: true,

        sameSite: "lax",

        path: "/",

        secure: false,

      },

    },

  },



  callbacks: {

    async jwt({ token, user }) {

      if (user) {

        token.role = (user as any).role;

        token.id = (user as any).id;

      }

      return token;

    },



    async session({ session, token }) {

      if (session.user) {

        (session.user as any).role = token.role;

        (session.user as any).id = token.id;

      }

      return session;

    },

  },



  pages: {

    signIn: "/login",

  },



  secret: process.env.NEXTAUTH_SECRET,

};