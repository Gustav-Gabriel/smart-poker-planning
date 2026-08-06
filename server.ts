import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { purgeExpired } from "./src/lib/room-store";
import { registerSocketHandlers } from "./src/lib/socket/handlers";
import { setIO } from "./src/lib/socket/io";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const app = next({ dev });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const httpServer = createServer((request, response) =>
      handle(request, response),
    );
    const io = new Server(httpServer, { path: "/api/socket" });
    setIO(io);
    registerSocketHandlers(io);

    setInterval(() => {
      purgeExpired(Date.now());
    }, 10 * 60 * 1000);

    httpServer.listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
    });
  })
  .catch((error: unknown) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
