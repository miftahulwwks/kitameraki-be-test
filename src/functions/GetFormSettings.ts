import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { errorResponse } from "../services/http-error";
import { readFormSettings } from "../services/task.service";

export async function GetFormSettings(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    return {
      status: 200,
      jsonBody: { fields: await readFormSettings() },
    };
  } catch (error) {
    return errorResponse(error, context);
  }
}

app.http("GetFormSettings", {
  methods: ["GET"],
  route: "form-settings",
  authLevel: "anonymous",
  handler: GetFormSettings,
});
