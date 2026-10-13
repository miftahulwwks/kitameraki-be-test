import { CosmosClient, Container } from "@azure/cosmos";

const databaseId = process.env.DatabaseName || "TaskDB";
export const taskOrganizationId = process.env.OrganizationId || "default";

let cosmosClient: CosmosClient | undefined;

const isConflictError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (("code" in error && error.code === 409) ||
    ("statusCode" in error && error.statusCode === 409));

const getCosmosClient = (): CosmosClient => {
  const connectionString = process.env.CosmosDB;
  if (!connectionString) {
    throw new Error("The CosmosDB application setting is required.");
  }

  cosmosClient ??= new CosmosClient(connectionString);
  return cosmosClient;
};

export const getContainer = async (
  containerId: string,
  partitionKeyPath = "/id",
): Promise<Container> => {
  const client = getCosmosClient();
  let database;
  try {
    ({ database } = await client.databases.createIfNotExists({
      id: databaseId,
    }));
  } catch (error) {
    if (!isConflictError(error)) {
      throw error;
    }
    database = client.database(databaseId);
    await database.read();
  }

  let container;
  try {
    ({ container } = await database.containers.createIfNotExists({
      id: containerId,
      partitionKey: { paths: [partitionKeyPath] },
    }));
  } catch (error) {
    if (!isConflictError(error)) {
      throw error;
    }
    container = database.container(containerId);
    await container.read();
  }
  return container;
};
