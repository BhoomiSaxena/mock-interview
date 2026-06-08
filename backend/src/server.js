const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");
const path = require("path");

// Always load backend/.env even if the server is started from a different cwd.
// Use override so local dev config wins over any system-level OPENAI_API_KEY.
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), override: true });

const app = express();

const PORT = Number(process.env.PORT || 5000);

const isProd = process.env.NODE_ENV === "production";
const envCorsOrigins = String(process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const localhostOriginRe = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser clients (no Origin header)
      if (!origin) return cb(null, true);

      // Always allow explicitly configured origins
      if (envCorsOrigins.length > 0) return cb(null, envCorsOrigins.includes(origin));

      // In dev, allow any localhost port (Vite may auto-bump ports)
      if (!isProd && localhostOriginRe.test(origin)) return cb(null, true);

      // Otherwise deny
      return cb(null, false);
    },
    credentials: false,
  })
);
app.use(express.json({ limit: "2mb" }));

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function httpError(statusCode, message, details) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (details !== undefined) err.details = details;
  return err;
}

function sendOk(res, data) {
  res.json({ ok: true, data });
}

function normalizeApiKey(value) {
  let apiKey = value;
  if (typeof apiKey === "string") {
    apiKey = apiKey.trim();
    // Common mistake: wrapping the key in quotes inside .env
    if (
      (apiKey.startsWith('"') && apiKey.endsWith('"')) ||
      (apiKey.startsWith("'") && apiKey.endsWith("'"))
    ) {
      apiKey = apiKey.slice(1, -1).trim();
    }
  }
  return apiKey;
}

function getOpenAICompatConfig() {
  const apiKey = normalizeApiKey(process.env.OPENAI_API_KEY);
  const explicitBaseUrl = normalizeApiKey(process.env.OPENAI_BASE_URL);

  // If the user provides OPENAI_BASE_URL, always honor it.
  // Otherwise, try to pick a reasonable default based on key prefix.
  const baseUrl =
    (typeof explicitBaseUrl === "string" && explicitBaseUrl.length > 0 && explicitBaseUrl) ||
    (typeof apiKey === "string" && apiKey.startsWith("gsk_")
      ? "https://api.groq.com/openai/v1"
      : "https://api.openai.com/v1");

  // Default model depends on provider.
  // Users can override via OPENAI_MODEL in backend/.env.
  const defaultModel =
    process.env.OPENAI_MODEL ||
    (String(baseUrl).includes("groq.com") ? "llama-3.1-8b-instant" : "gpt-4o-mini");

  return { apiKey, baseUrl, defaultModel };
}

app.get(["/health", "/api/health"], (_req, res) => {
  sendOk(res, { service: "backend", time: new Date().toISOString() });
});

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    message: "Backend is running",
    frontendUrl: "http://localhost:5173",
    healthUrl: `http://localhost:${PORT}/health`,
  });
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

app.post(
  "/upload-resume",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw httpError(400, "Missing file");
    if (req.file.mimetype !== "application/pdf") throw httpError(400, "Only PDF files are supported");

    if (typeof PDFParse !== "function") {
      throw httpError(500, "PDF parser is not available");
    }

    const parser = new PDFParse({ data: req.file.buffer });
    const parsed = await parser.getText();
    await parser.destroy();

    const text = (parsed.text || "").replace(/\s+/g, " ").trim();

    sendOk(res, {
      filename: req.file.originalname,
      pages: typeof parsed.total === "number" ? parsed.total : 0,
      text,
    });
  })
);

async function callOpenAIChatCompletions({ model, messages, temperature }) {
  const { apiKey, baseUrl } = getOpenAICompatConfig();
  if (
    typeof apiKey !== "string" ||
    apiKey.length < 20 ||
    apiKey === "your_openai_api_key_here" ||
    apiKey === "your_api_key_here"
  ) {
    throw httpError(
      500,
      "OpenAI is not configured",
      "Set OPENAI_API_KEY in backend/.env to a valid key and restart the backend"
    );
  }

  const url = `${String(baseUrl).replace(/\/+$/, "")}/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    // Do NOT forward raw OpenAI error bodies to clients (they can contain sensitive info).
    let code;
    let message;
    try {
      const body = await response.json();
      code = body?.error?.code;
      message = body?.error?.message;
    } catch {
      // ignore parse failures
    }

    if (response.status === 401 || code === "invalid_api_key") {
      throw httpError(
        401,
        "Invalid OpenAI API key",
        "Set OPENAI_API_KEY in backend/.env to a valid key and restart the backend"
      );
    }

    throw httpError(
      response.status,
      "OpenAI request failed",
      message ? String(message) : "Unexpected error from OpenAI"
    );
  }

  return response.json();
}

app.post(
  "/generate-question",
  asyncHandler(async (req, res) => {
    const { resumeText = "", role = "", level = "", focusAreas = [], askedQuestions = [] } = req.body || {};

    const { defaultModel } = getOpenAICompatConfig();
    const model = defaultModel;
    const system =
      "You are an interview assistant. Generate ONE interview question tailored to the candidate. " +
      "Return strict JSON only (no markdown, no extra text).";

    const userPrompt =
      "Create exactly 1 interview question.\n" +
      "Output JSON schema:\n" +
      "{\n" +
      "  \"question\": {\"category\": \"...\", \"difficulty\": \"easy|medium|hard\", \"question\": \"...\"}\n" +
      "}\n\n" +
      `Role: ${role || "(unspecified)"}\n` +
      `Level: ${level || "(unspecified)"}\n` +
      `Focus areas: ${Array.isArray(focusAreas) ? focusAreas.join(", ") : ""}\n` +
      `Avoid repeating these questions: ${Array.isArray(askedQuestions) ? askedQuestions.slice(0, 20).join(" | ") : ""}\n\n` +
      `Resume text (may be truncated):\n${String(resumeText).slice(0, 12000)}`;

    const data = await callOpenAIChatCompletions({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    });

    const content = data?.choices?.[0]?.message?.content || "";
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw httpError(502, "Model returned non-JSON content", content);
    }

    if (!parsed?.question?.question) {
      throw httpError(502, "Model returned invalid JSON shape", parsed);
    }

    sendOk(res, { model, ...parsed });
  })
);

app.post(
  "/evaluate-answer",
  asyncHandler(async (req, res) => {
    const { question, answer, resumeText = "", role = "", level = "" } = req.body || {};
    if (!question || typeof question !== "string") throw httpError(400, "Missing 'question' (string)");
    if (!answer || typeof answer !== "string") throw httpError(400, "Missing 'answer' (string)");

    const { defaultModel } = getOpenAICompatConfig();
    const model = defaultModel;

    const system =
      "You are an interview evaluator. Follow the user's output format exactly.";

    const userPrompt = `
You are an interview evaluator.

Evaluate the candidate's answer.

IMPORTANT:
- Return ONLY valid JSON
- Do NOT include any explanation
- Do NOT include text outside JSON
- Follow this exact format

{
  "score": number (0-10),
  "verdict": "Correct" | "Partially Correct" | "Incorrect",
  "strengths": ["point1", "point2"],
  "improvements": ["point1", "point2"],
  "suggestedAnswer": "string",
  "followUpQuestion": "string"
}

Context:
Role: ${role || "(unspecified)"}
Level: ${level || "(unspecified)"}
Resume (may be truncated): ${String(resumeText).slice(0, 2000)}

Question: ${question}
Answer: ${answer}
`;

    const data = await callOpenAIChatCompletions({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
    });

    const content = data?.choices?.[0]?.message?.content || "";
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw httpError(502, "Model returned non-JSON content", content);
    }

    const allowedVerdicts = new Set(["Correct", "Partially Correct", "Incorrect"]);
    const score = parsed?.score;
    const verdict = parsed?.verdict;
    if (
      typeof score !== "number" ||
      Number.isNaN(score) ||
      score < 0 ||
      score > 10 ||
      !allowedVerdicts.has(verdict) ||
      !Array.isArray(parsed?.strengths) ||
      !Array.isArray(parsed?.improvements) ||
      typeof parsed?.suggestedAnswer !== "string" ||
      typeof parsed?.followUpQuestion !== "string"
    ) {
      throw httpError(502, "Model returned invalid JSON shape", parsed);
    }

    sendOk(res, { model, evaluation: parsed });
  })
);

app.use((err, _req, res, _next) => {
  const status = err?.statusCode && Number.isFinite(err.statusCode) ? err.statusCode : 500;
  const message = err?.message || "Internal server error";
  const details = err?.details;
  const payload = { ok: false, error: { message } };
  if (details !== undefined) payload.error.details = details;
  res.status(status).json(payload);
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
  if (envCorsOrigins.length > 0) {
    console.log(`CORS origins: ${envCorsOrigins.join(", ")}`);
  } else if (!isProd) {
    console.log("CORS origins: http(s)://localhost:<any> (dev)");
  } else {
    console.log("CORS origins: (none configured)");
  }
});
