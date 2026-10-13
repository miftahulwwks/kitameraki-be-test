import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { errorResponse } from "../services/http-error";
import { createTask } from "../services/task.service";

export async function InsertTask(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const task = await createTask(await request.json());
    return { status: 201, jsonBody: task };
  } catch (error) {
    return errorResponse(error, context);
  }
}

app.http("InsertTask", {
  methods: ["POST"],
  route: "tasks",
  authLevel: "anonymous",
  handler: InsertTask,
});
