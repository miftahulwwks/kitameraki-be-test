import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { RequestValidationError, errorResponse } from "../services/http-error";
import { readTask } from "../services/task.service";

export async function GetTask(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    if (!id) {
      throw new RequestValidationError("Task ID is required.");
    }
    return { status: 200, jsonBody: await readTask(id) };
  } catch (error) {
    return errorResponse(error, context);
  }
}

app.http("GetTask", {
  methods: ["GET"],
  route: "tasks/{id}",
  authLevel: "anonymous",
  handler: GetTask,
});
