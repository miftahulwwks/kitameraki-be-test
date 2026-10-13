import type { InvocationContext, HttpResponseInit } from "@azure/functions";

export class RequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestValidationError";
  }
}

export const errorResponse = (
  error: unknown,
  context: InvocationContext,
): HttpResponseInit => {
  if (error instanceof RequestValidationError || error instanceof SyntaxError) {
    const message =
      error instanceof RequestValidationError
        ? error.message
        : "Request body must contain valid JSON.";
    return { status: 400, jsonBody: { error: message } };
  }

  const statusCode =
    typeof error === "object" && error !== null && "statusCode" in error
      ? error.statusCode
      : undefined;

  if (statusCode === 404) {
    return { status: 404, jsonBody: { error: "The requested resource was not found." } };
  }

  if (statusCode === 409) {
    return { status: 409, jsonBody: { error: "The resource already exists." } };
  }

  context.error("Request failed.", error);
  return {
    status: 500,
    jsonBody: { error: "An internal server error occurred." },
  };
};
