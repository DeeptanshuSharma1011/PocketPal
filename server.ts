import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  // Standard Middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Import router, automated worker service, and database utilities
  const apiRouter = (await import("./server/routes/api.js")).default;
  const { RecurringExecutionService } = await import("./server/services/recurringExecutionService.js");
  const { getDbPool, initializeDatabaseSchema } = await import("./server/config/db.js");

  // Mount API V1 consolidated endpoints
  app.use("/api/v1", apiRouter);

  // Automatically initialize database schema if connected to a real instance
  try {
    await initializeDatabaseSchema(getDbPool());
  } catch (err: any) {
    console.error("Failed to run database auto-migration on boot:", err);
  }

  // Initialize automated recurring scheduler engine on boot and set interval (hourly)
  console.log("[PocketPal Server] Launching automated recurring transactions daemon...");
  RecurringExecutionService.processDueTransactions().catch((err) => {
    console.error("Failed processing initial recurring transactions:", err);
  });
  setInterval(() => {
    RecurringExecutionService.processDueTransactions().catch((err) => {
      console.error("Scheduled recurring check failed:", err);
    });
  }, 3600000); // 1 hour intervals

  // API v1 Routing Prefix Placeholder
  app.get("/api/v1/health", (req, res) => {
    res.status(200).json({
      status: "success",
      message: "PocketPal API is healthy and running",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  // Vite middleware for development vs static asset serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[PocketPal Server] running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start PocketPal Server:", err);
  process.exit(1);
});
