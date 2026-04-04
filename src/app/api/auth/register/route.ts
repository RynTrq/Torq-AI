import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createUserWithPassword } from "@/lib/data/server";
import { toErrorResponse } from "@/lib/api/error-response";

const requestSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export async function POST(request: Request) {
  try {
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

    await createUserWithPassword({
      email: normalizedEmail,
      name,
      passwordHash,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, "Unable to create account");
  }
}
