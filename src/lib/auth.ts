import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";

const githubId = process.env.GITHUB_ID?.trim();
const githubSecret = process.env.GITHUB_SECRET?.trim();
const authSecret =
  process.env.AUTH_SECRET?.trim() ||
  process.env.NEXTAUTH_SECRET?.trim() ||
  (process.env.NODE_ENV !== "production"
    ? "torq-ai-dev-auth-secret"
    : undefined);

const redactEmail = (email: string) => {
  const [local, domain = ""] = email.split("@");

  if (!local) {
    return "unknown";
  }

  const visible = local.slice(0, 2);

  return `${visible}${"*".repeat(Math.max(local.length - 2, 1))}@${domain}`;
};

const providers: NextAuthOptions["providers"] = [];

if (githubId && githubSecret) {
  providers.push(
    GitHubProvider({
      clientId: githubId,
      clientSecret: githubSecret,
      authorization: {
        params: {
          scope: "read:user user:email repo workflow",
        },
      },
    }),
  );
}

providers.push(
  CredentialsProvider({
    id: "credentials",
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email?.trim().toLowerCase();
      const password = credentials?.password;

      if (!email || !password) {
        console.warn("[auth][credentials] Missing email or password");
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        console.warn(
          `[auth][credentials] User not found for ${redactEmail(email)}`,
        );
        return null;
      }

      if (!user.passwordHash) {
        console.warn(
          `[auth][credentials] No password set for ${redactEmail(email)}`,
        );
        return null;
      }

      const isValid = await compare(password, user.passwordHash);

      if (!isValid) {
        console.warn(
          `[auth][credentials] Password mismatch for ${redactEmail(email)}`,
        );
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      };
    },
  }),
);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  secret: authSecret,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
        session.user.image =
          typeof token.picture === "string"
            ? token.picture
            : session.user.image;
      }

      return session;
    },
  },
};

export const getAuthSession = () => getServerSession(authOptions);

export const requireUser = async () => {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return session.user;
};
