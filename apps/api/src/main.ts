import { appEnv } from "./config/env.js";
import { createApp } from "./app.js";

const port = appEnv.PORT;
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
