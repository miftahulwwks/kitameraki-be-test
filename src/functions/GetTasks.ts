import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { errorResponse } from "../services/http-error";
import { listTasks } from "../services/task.service";

export async function GetTasks(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    return { status: 200, jsonBody: await listTasks() };
  } catch (error) {
    return errorResponse(error, context);
  }
}

app.http("GetTasks", {
  methods: ["GET"],
  route: "tasks",
  authLevel: "anonymous",
  handler: GetTasks,
});
