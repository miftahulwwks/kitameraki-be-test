import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { errorResponse } from "../services/http-error";
import { saveFormSettings } from "../services/task.service";

export async function SaveFormSettings(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const fields = await saveFormSettings(await request.json());
    return { status: 200, jsonBody: { fields } };
  } catch (error) {
    return errorResponse(error, context);
  }
}

app.http("SaveFormSettings", {
  methods: ["PUT"],
  route: "form-settings",
  authLevel: "anonymous",
  handler: SaveFormSettings,
});
