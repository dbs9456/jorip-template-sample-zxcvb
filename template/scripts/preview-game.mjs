import http from "node:http";
import { Readable } from "node:stream";
import app from "../worker.js";

const port = Number.parseInt(process.env.PORT || "4173", 10);

const server = http.createServer(async (request, response) => {
  try {
    const origin = `http://${request.headers.host || `127.0.0.1:${port}`}`;
    const body = ["GET", "HEAD"].includes(request.method) ? undefined : Readable.toWeb(request);
    const webRequest = new Request(new URL(request.url || "/", origin), {
      method: request.method,
      headers: request.headers,
      body,
      ...(body ? { duplex: "half" } : {}),
    });
    const webResponse = await app.fetch(webRequest, {});
    response.writeHead(webResponse.status, Object.fromEntries(webResponse.headers));
    if (!webResponse.body) return response.end();
    Readable.fromWeb(webResponse.body).pipe(response);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(error instanceof Error ? error.message : "Preview error");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`미리보기: http://127.0.0.1:${port}`);
});
