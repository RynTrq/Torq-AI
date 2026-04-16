import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { toErrorResponse } from "@/lib/api/error-response";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json(
        {
          error:
            "Database is not configured. Set DATABASE_URL in your local environment and restart the dev server.",
          code: "DATABASE_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    const body = await request.json();
    const { name, email, password } = requestSchema.parse(body);
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "An account with this email already exists. Sign in instead, or use a different email.",
          code: "ACCOUNT_EXISTS",
        },
        { status: 409 },
      );
    }

    const passwordHash = await hash(password, 12);

    await prisma.user.create({
      data: {
        email: normalizedEmail,
        name,
        passwordHash,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists. Sign in instead, or use a different email.",
          code: "ACCOUNT_EXISTS",
        },
        { status: 409 },
      );
    }

    return toErrorResponse(error, "Unable to create account");
  }
}
