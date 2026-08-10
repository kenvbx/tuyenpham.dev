import { createApp } from "./app.js";

const DEFAULT_PORT = 4000;
const port = Number.parseInt(process.env["PORT"] ?? String(DEFAULT_PORT), 10);
const app = createApp();

const server = app.listen(port, () => {
  console.log(`CMS API listening on http://localhost:${port}`);
});

function shutdown(signal: NodeJS.Signals) {
  console.log(`Received ${signal}. Closing CMS API server.`);
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
