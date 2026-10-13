import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { RequestValidationError, errorResponse } from "../services/http-error";
import { removeTask } from "../services/task.service";

export async function DeleteTask(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    if (!id) {
      throw new RequestValidationError("Task ID is required.");
    }
    await removeTask(id);
    return { status: 204 };
  } catch (error) {
    return errorResponse(error, context);
  }
}

app.http("DeleteTask", {
  methods: ["DELETE"],
  route: "tasks/{id}",
  authLevel: "anonymous",
  handler: DeleteTask,
});
