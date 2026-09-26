import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function apiDevMiddleware() {
  return {
    name: "aura-api-dev",
    configureServer(server) {
      server.middlewares.use("/api/tag", async (req, res, next) => {
        if (req.method !== "POST") return next();

        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");

          const module = await import("./api/tag.js");
          const response = {
            statusCode: 200,
            status(code) {
              this.statusCode = code;
              return this;
            },
            setHeader(name, value) {
              res.setHeader(name, value);
              return this;
            },
            end(data) {
              res.statusCode = this.statusCode;
              res.end(data);
            }
          };

          await module.default({ ...req, body }, response);
        } catch (error) {
          console.error("Local API error:", error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Local API request failed." }));
          }
        }
      });

      server.middlewares.use("/api/stylist", async (req, res, next) => {
        if (req.method !== "POST") return next();

        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");

          const module = await import("./api/stylist.js");
          const response = {
            statusCode: 200,
            status(code) {
              this.statusCode = code;
              return this;
            },
            setHeader(name, value) {
              res.setHeader(name, value);
              return this;
            },
            end(data) {
              res.statusCode = this.statusCode;
              res.end(data);
            }
          };

          await module.default({ ...req, body }, response);
        } catch (error) {
          console.error("Local API error:", error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Local API request failed." }));
          }
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), apiDevMiddleware()]
});
