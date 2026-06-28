import { buildApp } from "./app.js";
import { env } from "./env.js";

buildApp().then((app) =>
  app
    .listen({ port: env.PORT, host: "0.0.0.0" })
    .then((address) => app.log.info(`API listening on ${address}`))
    .catch((err) => {
      app.log.error(err);
      process.exit(1);
    })
).catch((err) => {
  console.error(err);
  process.exit(1);
});
