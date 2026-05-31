const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const http = require("http");
const fs = require("fs");
const path = require("path");
const socketIo = require("socket.io");
const session = require("express-session");
const connectRedisModule = require("connect-redis");
const { createAdapter } = require("@socket.io/redis-adapter");

const { passport, o2router } = require("./src/middleware/oAuth2");
const { connectDb } = require("./src/config/db-connection");
const userRoutes = require("./src/routes/user-routes");
const wallRoutes = require("./src/routes/wall-routes");
const postRoutes = require("./src/routes/post-routes");
const uploadRoutes = require("./src/routes/upload-routes");
const mailRoutes = require("./src/routes/mail-routes");
const giphyRoutes = require("./src/routes/giphy-routes");
const eventRoutes = require("./src/routes/event-routes");
const { themesFolderPath, UI_BASE_URL, SOCKET_PATH } = require("./environment-config");
const { getAllowedCorsOrigins, sessionSecret } = require("./src/config/security-config");
const { connectProducer } = require("./src/utils/message-broker/producer");
const { increasePartitions } = require("./src/utils/message-broker/admin");
const { connectConsumer } = require("./src/utils/message-broker/consumer");
const auth = require("./src/middleware/auth");
const { client: redisClient } = require("./src/utils/redis");
const NotificationService = require("./src/services/notification-service");
const Response = require("./src/utils/error-handler");
const logger = require("./src/utils/logger");
const requestContext = require("./src/middleware/request-context");

const app = express();
const server = http.createServer(app);

// ── Socket.io + Redis adapter (fan-out across instances) ─────────────────────
const io = socketIo(server, {
  path: SOCKET_PATH,
  cors: { origin: getAllowedCorsOrigins(UI_BASE_URL), methods: ["GET", "POST"] },
});
const pubClient = redisClient.duplicate();
const subClient = redisClient.duplicate();
pubClient.on("error", (err) => logger.warn({ err: err.message }, "Redis pub client error"));
subClient.on("error", (err) => logger.warn({ err: err.message }, "Redis sub client error"));
io.adapter(createAdapter(pubClient, subClient));

// ── Socket.io auth + rooms ────────────────────────────────────────────────────
// Each user joins a room named "user:<email>". Emitting to a room works across
// all instances via the Redis adapter — no in-memory user→socketId map needed.
NotificationService.initialize(io);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  const email = auth.getEmailFromToken(token);
  if (!email) return next(new Error("Unauthorized notification socket"));
  socket.userEmail = email.toLowerCase();
  return next();
});

io.on("connection", (socket) => {
  const email = socket.userEmail;
  socket.join(`user:${email}`);           // join personal room
  NotificationService.sendNotification(email);

  socket.on("refreshNotifications", () => {
    NotificationService.sendNotification(email);
  });

  socket.on("updateNotification", (data, ack) => {
    NotificationService.updateNotificationStatus(data.notification, email, data.state)
      .then(() => ack?.({ ok: true }))
      .catch((error) => ack?.({ ok: false, message: error.message }));
  });

  socket.on("disconnect", () => {
    logger.debug({ email }, "socket disconnected");
  });
});

// ── Express middleware stack ──────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(requestContext);                  // stamps X-Request-ID on every request
app.use(cors({ origin: getAllowedCorsOrigins(UI_BASE_URL), credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(cookieParser());
// connect-redis v7 exports a function; v9 exports { RedisStore }
const RedisStore = typeof connectRedisModule === "function"
  ? connectRedisModule(session)
  : connectRedisModule.RedisStore ?? connectRedisModule.default;

app.use(passport.initialize());
app.use(
  session({
    store: new RedisStore({ client: redisClient, disableTouch: true }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 3,        // 3h — matches JWT lifetime
    },
  })
);

// ── Routes ───────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

app.use("", o2router);
app.use("/api/users", userRoutes);
app.use("/api/walls", wallRoutes);
app.use("/api/walls", postRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/mail", mailRoutes);
app.use("/api/giphy", giphyRoutes);
app.use("/api/events", eventRoutes);

// Themes — async reads, cached in-process after first load
let themesCache = null;
app.get("/api/themes", async (req, res) => {
  try {
    if (!themesCache) {
      const themes = await fs.promises.readdir(themesFolderPath);
      const lists = await Promise.all(
        themes.map(async (theme) => {
          const images = await fs.promises.readdir(path.join(themesFolderPath, theme));
          return {
            name: theme.replace(/\.[^/.]+$/, ""),
            images: images.map((image) =>
              path.join("assets", "images", "background_images", theme, image)
            ),
          };
        })
      );
      themesCache = lists;
    }
    return Response.respondOk(res, themesCache);
  } catch (err) {
    return Response.respondError(res, err);
  }
});

// ── Startup sequence ──────────────────────────────────────────────────────────
async function start() {
  // 1. Database — must be ready before serving requests
  await connectDb();

  // 2. Kafka — connect before server opens so no notifications are dropped
  if (process.env.ENABLE_KAFKA_NOTIFICATIONS === "true") {
    try {
      await increasePartitions("notifications", 5);
    } catch (err) {
      logger.warn({ err: err.message }, "Kafka partition increase failed — continuing");
    }
    try {
      await connectProducer();
      await connectConsumer();
      logger.info("Kafka connected");
    } catch (err) {
      logger.error({ err: err.message }, "Kafka connection failed — notifications will use direct delivery");
    }
  }

  // 3. Open HTTP server
  const port = process.env.PORT || 5000;
  server.listen(port, () => {
    logger.info({ port }, "Server running");
  });
}

start().catch((err) => {
  logger.error({ err }, "Startup failed");
  process.exit(1);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function shutdown(signal) {
  logger.info({ signal }, "Shutdown signal received");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

// ── Error guards ──────────────────────────────────────────────────────────────
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception — exiting");
  process.exit(1);
});
