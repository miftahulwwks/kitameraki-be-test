import { RequestValidationError } from "./http-error";

export const taskStatuses = ["Pending", "In Progress", "Completed"] as const;
export const taskPriorities = ["Low", "Medium", "High"] as const;
export const fieldTypes = ["Text", "Date", "Date and Time", "Email"] as const;

export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];
export type FieldType = (typeof fieldTypes)[number];
export type TaskRecord = {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  tags: string[];
  [key: string]: unknown;
};

export interface FormFieldConfig {
  id: string;
  name: string;
  type: FieldType;
  column: 1 | 2;
  order: number;
}

export interface FormSettingsRecord {
  id: string;
  fields: FormFieldConfig[];
}

const baseTaskFields = new Set([
  "id",
  "organizationId",
  "title",
  "description",
  "status",
  "priority",
  "dueDate",
  "tags",
  "_rid",
  "_self",
  "_etag",
  "_attachments",
  "_ts",
  "__proto__",
  "constructor",
  "prototype",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const requireString = (
  record: Record<string, unknown>,
  key: string,
  label: string,
  maxLength: number,
  required = false,
): string => {
  const value = record[key];
  if (value === undefined && !required) {
    return "";
  }
  if (typeof value !== "string") {
    throw new RequestValidationError(`${label} must be a string.`);
  }
  if (value.length > maxLength) {
    throw new RequestValidationError(
      `${label} must be no more than ${maxLength} characters.`,
    );
  }
  if (required && value.trim().length === 0) {
    throw new RequestValidationError(`${label} is required.`);
  }
  return value;
};

export const validateTask = (
  input: unknown,
  id: string,
  organizationId: string,
): TaskRecord => {
  if (!isRecord(input)) {
    throw new RequestValidationError("Task request body must be an object.");
  }

  const title = requireString(input, "title", "Title", 100, true).trim();
  const description = requireString(input, "description", "Description", 1000);
  const status = input.status ?? "Pending";
  if (
    typeof status !== "string" ||
    !taskStatuses.includes(status as TaskStatus)
  ) {
    throw new RequestValidationError("Status is not supported.");
  }

  const priority = input.priority ?? "Medium";
  if (
    typeof priority !== "string" ||
    !taskPriorities.includes(priority as TaskPriority)
  ) {
    throw new RequestValidationError("Priority is not supported.");
  }

  const dueDate = requireString(input, "dueDate", "Due date", 40);
  if (dueDate && Number.isNaN(Date.parse(dueDate))) {
    throw new RequestValidationError("Due date must be a valid date.");
  }

  const tagsValue = input.tags ?? [];
  if (
    !Array.isArray(tagsValue) ||
    !tagsValue.every(
      (tag) => typeof tag === "string" && tag.length <= 50,
    )
  ) {
    throw new RequestValidationError(
      "Tags must be an array of strings no longer than 50 characters.",
    );
  }

  const customFields: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      throw new RequestValidationError(`Custom field "${key}" is not allowed.`);
    }
    if (baseTaskFields.has(key)) {
      continue;
    }
    if (
      !/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(key) ||
      key === "constructor" ||
      key === "prototype" ||
      typeof value !== "string" ||
      value.length > 2000
    ) {
      throw new RequestValidationError(
        `Custom field "${key}" must have a valid name and a string value of no more than 2000 characters.`,
      );
    }
    customFields[key] = value;
  }

  return {
    id,
    organizationId,
    title,
    description,
    status: status as TaskStatus,
    priority: priority as TaskPriority,
    ...(dueDate ? { dueDate } : {}),
    tags: tagsValue.map((tag) => tag.trim()),
    ...customFields,
  };
};

export const validateFormSettings = (input: unknown): FormFieldConfig[] => {
  if (!isRecord(input) || !Array.isArray(input.fields)) {
    throw new RequestValidationError(
      "Settings request body must contain a fields array.",
    );
  }

  const ids = new Set<string>();
  const reservedIds = baseTaskFields;
  const fields = input.fields.map((value, index): FormFieldConfig => {
    if (!isRecord(value)) {
      throw new RequestValidationError(`Field ${index + 1} must be an object.`);
    }

    const id = requireString(value, "id", `Field ${index + 1} ID`, 80, true);
    const name = requireString(
      value,
      "name",
      `Field ${index + 1} name`,
      100,
      true,
    ).trim();
    if (
      !/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(id) ||
      reservedIds.has(id) ||
      ids.has(id)
    ) {
      throw new RequestValidationError(
        `Field ${index + 1} has an invalid or duplicate ID.`,
      );
    }
    ids.add(id);

    const type = value.type;
    if (
      typeof type !== "string" ||
      !fieldTypes.includes(type as FieldType)
    ) {
      throw new RequestValidationError(
        `Field ${index + 1} has an unsupported type.`,
      );
    }

    const column = value.column;
    if (column !== 1 && column !== 2) {
      throw new RequestValidationError(
        `Field ${index + 1} must be assigned to column 1 or 2.`,
      );
    }

    return { id, name, type: type as FieldType, column, order: index + 1 };
  });

  return fields;
};
