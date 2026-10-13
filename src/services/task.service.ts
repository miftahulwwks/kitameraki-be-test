import { randomUUID } from "node:crypto";
import type {
  TaskPriority,
  TaskRecord,
  TaskStatus,
  FormFieldConfig,
} from "./task.validation";
import {
  taskPriorities,
  taskStatuses,
  validateFormSettings,
  validateTask,
} from "./task.validation";
import { getContainer, taskOrganizationId } from "./cosmos.service";
import { RequestValidationError } from "./http-error";

const settingsId = "settings_id";
const legacyStatuses: Record<string, TaskStatus> = {
  todo: "Pending",
  "in-progress": "In Progress",
  completed: "Completed",
};
const legacyPriorities: Record<string, TaskPriority> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const normalizeTask = (task: TaskRecord): TaskRecord => ({
  ...task,
  title: typeof task.title === "string" ? task.title : "",
  description:
    typeof task.description === "string" ? task.description : "",
  status:
    legacyStatuses[String(task.status)] ??
    (taskStatuses.includes(task.status as TaskStatus)
      ? (task.status as TaskStatus)
      : undefined) ??
    "Pending",
  priority:
    legacyPriorities[String(task.priority)] ??
    (taskPriorities.includes(task.priority as TaskPriority)
      ? (task.priority as TaskPriority)
      : undefined) ??
    "Medium",
  tags: Array.isArray(task.tags)
    ? task.tags.filter((tag): tag is string => typeof tag === "string")
    : [],
});

export const listTasks = async (): Promise<TaskRecord[]> => {
  const container = await getContainer("Tasks", "/organizationId");
  const { resources } = await container.items
    .query<TaskRecord>({
      query: "SELECT * FROM c WHERE c.organizationId = @organizationId",
      parameters: [{ name: "@organizationId", value: taskOrganizationId }],
    })
    .fetchAll();
  return resources.map(normalizeTask);
};

export const readTask = async (id: string): Promise<TaskRecord> => {
  const container = await getContainer("Tasks", "/organizationId");
  const { resource } = await container
    .item(id, taskOrganizationId)
    .read<TaskRecord>();
  if (!resource) {
    const missing = new Error("Task was not found.") as Error & {
      statusCode: number;
    };
    missing.statusCode = 404;
    throw missing;
  }
  return normalizeTask(resource);
};

export const createTask = async (input: unknown): Promise<TaskRecord> => {
  const container = await getContainer("Tasks", "/organizationId");
  const task = validateTask(input, randomUUID(), taskOrganizationId);
  const { resource } = await container.items.create(task);
  if (!resource) {
    throw new Error("Cosmos DB did not return the created task.");
  }
  return resource;
};

export const replaceTask = async (
  id: string,
  input: unknown,
): Promise<TaskRecord> => {
  const container = await getContainer("Tasks", "/organizationId");
  const task = validateTask(input, id, taskOrganizationId);
  const { resource } = await container.item(id, taskOrganizationId).replace(task);
  if (!resource) {
    throw new Error("Cosmos DB did not return the updated task.");
  }
  return resource;
};

export const removeTask = async (id: string): Promise<void> => {
  const container = await getContainer("Tasks", "/organizationId");
  await container.item(id, taskOrganizationId).delete();
};

export const removeTasks = async (ids: unknown): Promise<void> => {
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > 100 ||
    !ids.every((id) => typeof id === "string" && id.length > 0)
  ) {
    throw new RequestValidationError(
      "Task IDs must be an array of 1 to 100 non-empty strings.",
    );
  }
  const container = await getContainer("Tasks", "/organizationId");
  await Promise.all(
    ids.map((id: string) => container.item(id, taskOrganizationId).delete()),
  );
};

export const readFormSettings = async (): Promise<FormFieldConfig[]> => {
  const container = await getContainer("FormSettings");
  try {
    const { resource } = await container
      .item(settingsId, settingsId)
      .read<{ fields?: unknown }>();
    return validateFormSettings({ fields: resource?.fields ?? [] });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      error.statusCode === 404
    ) {
      return [];
    }
    throw error;
  }
};

export const saveFormSettings = async (
  input: unknown,
): Promise<FormFieldConfig[]> => {
  const fields = validateFormSettings(input);
  const container = await getContainer("FormSettings");
  await container.items.upsert({ id: settingsId, fields });
  return fields;
};
