import { NextResponse } from "next/server";

const getMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message.replace(/^Uncaught Error:\s*/, "");
  }

  return fallback;
};

const getStatusCode = (message: string) => {
  if (/Unauthorized/i.test(message)) {
    return 401;
  }

  if (/not found/i.test(message)) {
    return 404;
  }

  return 400;
};

export const toErrorResponse = (
  error: unknown,
  fallback = "Request failed",
) => {
  const message = getMessage(error, fallback);

  return NextResponse.json(
    { error: message },
    { status: getStatusCode(message) },
  );
};
