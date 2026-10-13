const assert = require("node:assert/strict");
const test = require("node:test");
const {
  validateFormSettings,
  validateTask,
} = require("../dist/src/services/task.validation.js");
const { normalizeTask } = require("../dist/src/services/task.service.js");

test("validates task data and applies documented defaults", () => {
  const task = validateTask(
    {
      title: "  Prepare release  ",
      description: "Review the deployment checklist.",
      custom_contact: "owner@example.com",
      tags: ["release"],
    },
    "task-id",
    "default",
  );

  assert.equal(task.title, "Prepare release");
  assert.equal(task.status, "Pending");
  assert.equal(task.priority, "Medium");
  assert.deepEqual(task.tags, ["release"]);
  assert.equal(task.custom_contact, "owner@example.com");
});

test("rejects invalid task values and protected properties", () => {
  assert.throws(
    () => validateTask({ title: " ", status: "Unknown" }, "id", "default"),
    /Title is required/,
  );
  assert.throws(
    () =>
      validateTask(
        { title: "Task", status: "Unknown" },
        "id",
        "default",
      ),
    /Status is not supported/,
  );
  assert.throws(
    () =>
      validateTask(
        JSON.parse('{"title":"Task","__proto__":"unsafe"}'),
        "id",
        "default",
      ),
    /Custom field/,
  );
});

test("normalizes field order and accepts supported form field types", () => {
  const fields = validateFormSettings({
    fields: [
      { id: "field_contact", name: "Contact", type: "Email", column: 2 },
      { id: "field_due", name: "Review date", type: "Date", column: 1 },
    ],
  });

  assert.deepEqual(
    fields.map(({ id, order }) => ({ id, order })),
    [
      { id: "field_contact", order: 1 },
      { id: "field_due", order: 2 },
    ],
  );
});

test("rejects duplicate, reserved, and unsupported form fields", () => {
  assert.throws(
    () =>
      validateFormSettings({
        fields: [
          { id: "field_custom", name: "First", type: "Text", column: 1 },
          { id: "field_custom", name: "Second", type: "Text", column: 2 },
        ],
      }),
    /invalid or duplicate ID/,
  );
  assert.throws(
    () =>
      validateFormSettings({
        fields: [{ id: "title", name: "Title", type: "Text", column: 1 }],
      }),
    /invalid or duplicate ID/,
  );
  assert.throws(
    () =>
      validateFormSettings({
        fields: [
          { id: "field_invalid", name: "Invalid", type: "Number", column: 3 },
        ],
      }),
    /unsupported type/,
  );
});

test("normalizes task records from the original backend schema", () => {
  const task = normalizeTask({
    id: "legacy-task",
    organizationId: "default",
    title: "Legacy task",
    status: "in-progress",
    priority: "high",
  });

  assert.equal(task.status, "In Progress");
  assert.equal(task.priority, "High");
  assert.equal(task.description, "");
  assert.deepEqual(task.tags, []);
});
