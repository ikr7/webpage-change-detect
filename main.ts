import { Hono } from "hono";
import { validator } from "hono/validator";

export interface Watcher {
  type: "content" | "count" | "attribute" | "number";
  id: string;
  url: string;
  selector: string;
  intervalSec: number;
  webhookUrl: string;
  previous?: string | number;
  attribute?: string;
}

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.post(
  "/api/watchers",
  validator("json", (value, c) => {
    if (
      !value.url
      || !value.type
      || !value.selector
      || !value.intervalSec
      || !value.webhookUrl
    ) {
      return c.json(
        {
          message: "invalid"
        },
        400
      );
    }
    return {
      id: crypto.randomUUID(),
      previous: null,
      ...value,
    }
  }),
  (c) => {
    const watcher: Watcher = c.req.valid("json");
    console.log(watcher);
    return c.json({});
  }
);

Deno.serve(app.fetch);
