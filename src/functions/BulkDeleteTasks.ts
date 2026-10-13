import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { errorResponse, RequestValidationError } from "../services/http-error";
import { removeTasks } from "../services/task.service";

export async function BulkDeleteTasks(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const ids: unknown = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new RequestValidationError(
        "Request body must contain at least one task ID.",
      );
    }
    await removeTasks(ids);
    return { status: 204 };
  } catch (error) {
    return errorResponse(error, context);
  }
}

app.http("BulkDeleteTasks", {
  methods: ["DELETE"],
  route: "tasks/bulk-delete",
  authLevel: "anonymous",
  handler: BulkDeleteTasks,
});
