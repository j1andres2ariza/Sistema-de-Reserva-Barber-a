import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DemoStore, DEMO_USER } from "./demo-store.mjs";
const PREFIX = "/__demo-api";
const ORIGINS = new Set(["http://localhost:8080", "http://127.0.0.1:8080"]);
const SAFE_FILE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,120}$/;
function imageType(buffer) {
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255)
    return "image/jpeg";
  if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
  return null;
}
export async function startDemoServer({ directory, port = 0 } = {}) {
  if (!directory) throw new Error("Local data directory required");
  const store = new DemoStore(directory),
    sessions = new Set();
  const uploads = join(directory, "uploads");
  mkdirSync(uploads, { recursive: true });
  const server = createServer(async (req, res) => {
    const send = (data, status = 200) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(JSON.stringify(data));
    };
    const path = new URL(req.url, "http://127.0.0.1").pathname;
    const cookie = req.headers.cookie
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("barberia_demo="))
      ?.slice("barberia_demo=".length);
    const admin = Boolean(cookie && sessions.has(cookie));
    try {
      if (req.method === "POST" && !ORIGINS.has(req.headers.origin))
        return send({ error: "ORIGIN_NOT_ALLOWED" }, 403);
      if (req.method === "GET") {
        if (path === `${PREFIX}/session`)
          return send({ session: admin ? { user: DEMO_USER } : null });
        if (path === `${PREFIX}/revision`)
          return send({ revision: store.revision() });
        if (path.startsWith(`${PREFIX}/files/`)) {
          const name = decodeURIComponent(
            path.slice(`${PREFIX}/files/`.length),
          );
          if (!SAFE_FILE.test(name))
            return send({ error: "INVALID_FILE" }, 400);
          let bytes;
          try {
            bytes = readFileSync(join(uploads, name));
          } catch {
            return send({ error: "NOT_FOUND" }, 404);
          }
          const type = imageType(bytes);
          if (!type) return send({ error: "INVALID_IMAGE" }, 400);
          res.writeHead(200, {
            "Content-Type": type,
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "public,max-age=3600",
          });
          return res.end(bytes);
        }
        return send({ error: "NOT_FOUND" }, 404);
      }
      if (req.method !== "POST")
        return send({ error: "METHOD_NOT_ALLOWED" }, 405);
      const limit = path === `${PREFIX}/upload` ? 8 * 1024 * 1024 : 65536;
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > limit) {
          send({ error: "BODY_TOO_LARGE" }, 413);
          req.resume();
          return;
        }
        chunks.push(chunk);
      }
      let body;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString());
      } catch {
        return send({ error: "INVALID_JSON" }, 400);
      }
      if (path === `${PREFIX}/login`) {
        const token = randomBytes(32).toString("hex");
        sessions.add(token);
        res.setHeader(
          "Set-Cookie",
          `barberia_demo=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`,
        );
        return send({ user: DEMO_USER, session: { user: DEMO_USER } });
      }
      if (path === `${PREFIX}/logout`) {
        sessions.delete(cookie);
        res.setHeader(
          "Set-Cookie",
          "barberia_demo=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        );
        return send({});
      }
      if (path === `${PREFIX}/query`) {
        if (body.table === "bookings" && body.op === "delete") {
          if (!admin) return send({ error: "FORBIDDEN" }, 403);
          const id = body.filters?.find((f) => f.key === "id")?.value;
          if (typeof id !== "string")
            return send({ error: "INVALID_QUERY" }, 400);
          store.deleteBooking(id);
          return send({ data: [], revision: store.revision() });
        }
        return send({
          data: store.query(body, admin),
          revision: store.revision(),
        });
      }
      if (path === `${PREFIX}/rpc`) {
        if (body.name === "get_public_availability")
          return send({ data: store.availability() });
        return send(
          { error: admin ? "DEMO_NO_SEND" : "FORBIDDEN" },
          admin ? 400 : 403,
        );
      }
      if (path === `${PREFIX}/create-booking`)
        return send({ booking: store.createBooking(body) }, 201);
      if (path === `${PREFIX}/upload`) {
        if (!admin) return send({ error: "FORBIDDEN" }, 403);
        if (!SAFE_FILE.test(body.path) || typeof body.base64 !== "string")
          return send({ error: "INVALID_FILE" }, 400);
        const bytes = Buffer.from(body.base64, "base64");
        if (bytes.length > 5 * 1024 * 1024 || !imageType(bytes))
          return send(
            { error: "Usa una imagen JPG, PNG o WebP de hasta 5 MB." },
            400,
          );
        writeFileSync(join(uploads, body.path), bytes);
        return send({ path: body.path });
      }
      return send({ error: "NOT_FOUND" }, 404);
    } catch (error) {
      send(
        { error: error.message || "LOCAL_SERVER_ERROR" },
        error.status ?? 500,
      );
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return {
    store,
    server,
    port: server.address().port,
    close: async () => {
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      store.close();
    },
  };
}
