# Task Manager API

TypeScript Azure Functions v4 API using Azure Cosmos DB.

## Requirements

- Node.js 20 or later and npm.
- Azure Functions Core Tools v4.
- Azure Cosmos DB Emulator for local development, or an Azure Cosmos DB account.
- Azurite or an Azure Storage account for `AzureWebJobsStorage`.

## Configure and run locally

1. Start the Cosmos DB Emulator. Azurite is included with the backend
   development dependencies and can be run in its own terminal:

   ```powershell
   npm ci
   npm run storage
   ```
2. From this directory, copy the local settings example:

   ```powershell
   Copy-Item local.settings.json.example local.settings.json
   ```

3. For the local emulator, set `CosmosDB` to the emulator connection string
   (normally `https://localhost:8081`) and keep `DatabaseName` as `TaskDB`.
   Use a second terminal to validate the emulator certificate and start the
   Functions host:

   ```powershell
   .\scripts\start-emulator.ps1
   ```

   The script does not disable TLS verification. If using an Azure Cosmos DB
   account instead, set its connection string and start the API with
   `npm start`.

The API listens at `http://localhost:7071/api`. Local settings are ignored by
Git and must never contain production credentials in a commit. For Azure,
configure `CosmosDB`, `DatabaseName`, and `OrganizationId` as Function App
application settings. Configure the deployed client origin in the Function
App's CORS settings instead of using a wildcard.

`OrganizationId` defaults to `default` for local single-organization
development. It is a Cosmos partition key value, not an authentication or
authorization boundary. Add an identity provider and enforce tenant access
before exposing this anonymous API to untrusted users.

## API routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/tasks` | List tasks for the configured organization |
| `POST` | `/api/tasks` | Create a task |
| `GET` | `/api/tasks/{id}` | Read one task |
| `PUT` | `/api/tasks/{id}` | Replace a task |
| `DELETE` | `/api/tasks/{id}` | Delete a task |
| `GET` | `/api/form-settings` | Read the shared task form configuration |
| `PUT` | `/api/form-settings` | Save the shared task form configuration |

Task routes use the same status values and payload shape as the React client.
Custom fields are stored as string properties on each task document.

## Tests and build

```powershell
npm test
npm run build
```
