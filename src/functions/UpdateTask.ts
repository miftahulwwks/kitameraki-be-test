import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { RequestValidationError, errorResponse } from "../services/http-error";
import { replaceTask } from "../services/task.service";

export async function UpdateTask(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    if (!id) {
      throw new RequestValidationError("Task ID is required.");
    }
    const task = await replaceTask(id, await request.json());
    return { status: 200, jsonBody: task };
  } catch (error) {
    return errorResponse(error, context);
  }
}

app.http("UpdateTask", {
  methods: ["PUT"],
  route: "tasks/{id}",
  authLevel: "anonymous",
  handler: UpdateTask,
});
