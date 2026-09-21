console.log("🚀 SERVER BOOT SEQUENCE INITIATED");

import express from "express";
import type { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import pkg from "pg";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.PG_HOST || "postgres",
  database: process.env.PG_DB || "ai_lab_oracle",
  user: process.env.PG_USER || "oracle",
  password: process.env.PG_PASSWORD || "",
  port: parseInt(process.env.PG_PORT || "5432"),
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error(
    "[FATAL] JWT_SECRET is not set. Generate one with: openssl rand -hex 32"
  );
  process.exit(1);
}

// Run migrations on startup
async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS oracle_users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      gemini_api_key TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_login TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS oracle_specs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES oracle_users(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      value TEXT NOT NULL,
      icon TEXT DEFAULT 'Cpu',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS oracle_experiments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES oracle_users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      source_link TEXT,
      idea_text TEXT NOT NULL,
      analysis JSONB NOT NULL,
      plan JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS oracle_research (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES oracle_users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      link TEXT NOT NULL,
      content_snippet TEXT,
      pub_date TEXT,
      author TEXT,
      saved_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, link)
    );
  `);
  console.log("[DB] Migrations complete");
}

// Auth middleware
interface AuthRequest extends Request {
  userId?: number;
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log(`[INIT] Starting server on port ${PORT}...`);
  console.log(`[INIT] NODE_ENV: ${process.env.NODE_ENV}`);

  app.use(express.json());

  // Request Logger
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Host: ${req.get("host")}`);
    next();
  });

  // ── Health ──────────────────────────────────────────────────────────────────
  app.get("/ping", (req: Request, res: Response) => res.send("pong"));

  app.get("/api/health", (req: Request, res: Response) => {
    res.json({
      status: "ok",
      node_env: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      dist_exists: fs.existsSync(path.join(process.cwd(), "dist")),
      index_exists: fs.existsSync(path.join(process.cwd(), "dist", "index.html")),
    });
  });

  // ── Auth ────────────────────────────────────────────────────────────────────
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { username, password, displayName } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    try {
      const hash = await bcrypt.hash(password, 10);
      const result = await pool.query(
        "INSERT INTO oracle_users (username, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, username, display_name, gemini_api_key",
        [username, hash, displayName || username]
      );
      const user = result.rows[0];
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
      res.json({ token, user: { id: user.id, username: user.username, displayName: user.display_name, geminiApiKey: user.gemini_api_key } });
    } catch (err: any) {
      if (err.code === "23505") return res.status(409).json({ error: "Username already taken" });
      console.error("[AUTH] Register error:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    try {
      const result = await pool.query(
        "SELECT id, username, password_hash, display_name, gemini_api_key FROM oracle_users WHERE username = $1",
        [username]
      );
      const user = result.rows[0];
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      await pool.query("UPDATE oracle_users SET last_login = NOW() WHERE id = $1", [user.id]);
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
      res.json({ token, user: { id: user.id, username: user.username, displayName: user.display_name, geminiApiKey: user.gemini_api_key } });
    } catch (err) {
      console.error("[AUTH] Login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(
        "SELECT id, username, display_name, gemini_api_key FROM oracle_users WHERE id = $1",
        [req.userId]
      );
      const user = result.rows[0];
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ id: user.id, username: user.username, displayName: user.display_name, geminiApiKey: user.gemini_api_key });
    } catch (err) {
      console.error("[AUTH] /me error:", err);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // ── User Settings ───────────────────────────────────────────────────────────
  app.put("/api/user/settings", requireAuth, async (req: AuthRequest, res: Response) => {
    const { geminiApiKey } = req.body;
    try {
      await pool.query("UPDATE oracle_users SET gemini_api_key = $1 WHERE id = $2", [geminiApiKey || "", req.userId]);
      res.json({ ok: true });
    } catch (err) {
      console.error("[SETTINGS] Error:", err);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // ── Specs ───────────────────────────────────────────────────────────────────
  app.get("/api/specs", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(
        "SELECT id::text, label, value, icon FROM oracle_specs WHERE user_id = $1 ORDER BY created_at ASC",
        [req.userId]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("[SPECS] GET error:", err);
      res.status(500).json({ error: "Failed to fetch specs" });
    }
  });

  app.post("/api/specs", requireAuth, async (req: AuthRequest, res: Response) => {
    const { label, value, icon = "Cpu" } = req.body;
    if (!label || !value) return res.status(400).json({ error: "Label and value required" });
    try {
      const result = await pool.query(
        "INSERT INTO oracle_specs (user_id, label, value, icon) VALUES ($1, $2, $3, $4) RETURNING id::text, label, value, icon",
        [req.userId, label, value, icon]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("[SPECS] POST error:", err);
      res.status(500).json({ error: "Failed to add spec" });
    }
  });

  // Seed defaults — inserts only if user has no specs yet
  app.post("/api/specs/seed", requireAuth, async (req: AuthRequest, res: Response) => {
    const { specs } = req.body;
    if (!Array.isArray(specs)) return res.status(400).json({ error: "specs must be an array" });
    try {
      const existing = await pool.query("SELECT id FROM oracle_specs WHERE user_id = $1 LIMIT 1", [req.userId]);
      if (existing.rows.length > 0) return res.json({ skipped: true });
      for (const spec of specs) {
        await pool.query(
          "INSERT INTO oracle_specs (user_id, label, value, icon) VALUES ($1, $2, $3, $4)",
          [req.userId, spec.label, spec.value, spec.icon || "Cpu"]
        );
      }
      res.json({ seeded: specs.length });
    } catch (err) {
      console.error("[SPECS] SEED error:", err);
      res.status(500).json({ error: "Failed to seed specs" });
    }
  });

  app.delete("/api/specs/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      await pool.query("DELETE FROM oracle_specs WHERE id = $1 AND user_id = $2", [req.params.id, req.userId]);
      res.json({ ok: true });
    } catch (err) {
      console.error("[SPECS] DELETE error:", err);
      res.status(500).json({ error: "Failed to delete spec" });
    }
  });

  // ── Saved Research ──────────────────────────────────────────────────────────
  app.get("/api/research", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(
        "SELECT title, link, content_snippet AS \"contentSnippet\", pub_date AS \"pubDate\", author FROM oracle_research WHERE user_id = $1 ORDER BY saved_at DESC",
        [req.userId]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("[RESEARCH] GET error:", err);
      res.status(500).json({ error: "Failed to fetch research" });
    }
  });

  app.post("/api/research", requireAuth, async (req: AuthRequest, res: Response) => {
    const { title, link, contentSnippet, pubDate, author } = req.body;
    if (!title || !link) return res.status(400).json({ error: "Title and link required" });
    try {
      await pool.query(
        "INSERT INTO oracle_research (user_id, title, link, content_snippet, pub_date, author) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user_id, link) DO NOTHING",
        [req.userId, title, link, contentSnippet || "", pubDate || "", author || ""]
      );
      res.json({ ok: true });
    } catch (err) {
      console.error("[RESEARCH] POST error:", err);
      res.status(500).json({ error: "Failed to save research" });
    }
  });

  app.delete("/api/research", requireAuth, async (req: AuthRequest, res: Response) => {
    const { link } = req.body;
    if (!link) return res.status(400).json({ error: "Link required" });
    try {
      await pool.query("DELETE FROM oracle_research WHERE user_id = $1 AND link = $2", [req.userId, link]);
      res.json({ ok: true });
    } catch (err) {
      console.error("[RESEARCH] DELETE error:", err);
      res.status(500).json({ error: "Failed to delete research" });
    }
  });

  // ── Experiments ─────────────────────────────────────────────────────────────
  app.get("/api/experiments", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT id, title, source_link AS "sourceLink", idea_text AS "ideaText",
                analysis, plan, created_at AS "createdAt"
         FROM oracle_experiments WHERE user_id = $1 ORDER BY created_at DESC`,
        [req.userId]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("[EXPERIMENTS] GET error:", err);
      res.status(500).json({ error: "Failed to fetch experiments" });
    }
  });

  app.post("/api/experiments", requireAuth, async (req: AuthRequest, res: Response) => {
    const { title, sourceLink, ideaText, analysis } = req.body;
    if (!title || !ideaText || !analysis) return res.status(400).json({ error: "title, ideaText, and analysis required" });
    try {
      const result = await pool.query(
        `INSERT INTO oracle_experiments (user_id, title, source_link, idea_text, analysis)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [req.userId, title, sourceLink || null, ideaText, JSON.stringify(analysis)]
      );
      res.json({ id: result.rows[0].id });
    } catch (err) {
      console.error("[EXPERIMENTS] POST error:", err);
      res.status(500).json({ error: "Failed to save experiment" });
    }
  });

  app.patch("/api/experiments/:id/plan", requireAuth, async (req: AuthRequest, res: Response) => {
    const { plan } = req.body;
    if (!plan) return res.status(400).json({ error: "plan required" });
    try {
      await pool.query(
        `UPDATE oracle_experiments SET plan = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
        [JSON.stringify(plan), req.params.id, req.userId]
      );
      res.json({ ok: true });
    } catch (err) {
      console.error("[EXPERIMENTS] PATCH plan error:", err);
      res.status(500).json({ error: "Failed to update plan" });
    }
  });

  // ── Local AI Proxy ──────────────────────────────────────────────────────────
  app.post("/api/local-ai", requireAuth, async (req: AuthRequest, res: Response) => {
    const localAiUrl = process.env.LOCAL_AI_URL || "http://localhost:8000/v1/chat/completions";
    const localAiModel = process.env.LOCAL_AI_MODEL || "local-model";
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (process.env.LOCAL_AI_API_KEY) {
        headers["Authorization"] = `Bearer ${process.env.LOCAL_AI_API_KEY}`;
      }
      const response = await fetch(localAiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: localAiModel,
          messages: req.body.messages,
          stream: false,
          temperature: 0.3,
        }),
      });
      if (!response.ok) {
        const err = await response.text();
        return res.status(502).json({ error: `Local AI error: ${err}` });
      }
      res.json(await response.json());
    } catch (err) {
      console.error("[LOCAL-AI] Error:", err);
      res.status(502).json({ error: "Failed to reach local AI model" });
    }
  });

  // ── Research Feed (Arxiv proxy) ─────────────────────────────────────────────
  app.get("/api/research-feed", async (req: Request, res: Response) => {
    console.log("[RSS] Fetching research feed from Arxiv API...");
    try {
      const apiUrl = "http://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=10";
      const response = await fetch(apiUrl);
      const xml = await response.text();

      const items = [];
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
      let match;

      while ((match = entryRegex.exec(xml)) !== null && items.length < 10) {
        const entry = match[1];
        const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() || "Untitled Paper";
        const link = entry.match(/<link href="([\s\S]*?)"/)?.[1] || "";
        const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim() || "";
        const pubDate = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1] || "";
        const author = entry.match(/<author>\s*<name>([\s\S]*?)<\/name>/)?.[1] || "Unknown Author";

        items.push({
          title: title.replace(/\s+/g, " "),
          link,
          contentSnippet: summary.substring(0, 300) + (summary.length > 300 ? "..." : ""),
          pubDate,
          author,
        });
      }

      console.log(`[RSS] Successfully parsed ${items.length} items`);
      res.json(items);
    } catch (error) {
      console.error("[RSS] Error fetching research feed:", error);
      res.json([]);
    }
  });

  // ── Static / SPA ────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Production build not found. Please run build first.");
      }
    });
  }

  await migrate();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
