import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth";

const REPOSITORY = "DoktainerApp/doktainer";
const BRANCH = "main";
const PATH_FILTER = "";
const MAX_COMMITS = 5;
const CACHE_TTL_MS = 5 * 60 * 1000;

type GithubCommitPayload = {
  sha?: unknown;
  html_url?: unknown;
  commit?: {
    message?: unknown;
    author?: {
      name?: unknown;
      date?: unknown;
    };
  };
  author?: {
    login?: unknown;
    avatar_url?: unknown;
    html_url?: unknown;
  } | null;
};

type CommitHistoryItem = {
  id: string;
  sha: string;
  shortSha: string;
  title: string;
  message: string;
  authorName: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  url: string;
  committedAt: string;
};

type CommitHistoryCache = {
  expiresAt: number;
  payload: {
    success: true;
    data: CommitHistoryItem[];
    meta: {
      repository: string;
      branch: string;
      path: string;
    };
  };
};

let cache: CommitHistoryCache | null = null;

function normalizeRepository(value: string) {
  return value.replace(/^https:\/\/github\.com\//i, "").replace(/\.git$/i, "");
}

function getCommitHistoryConfig() {
  return {
    repository: normalizeRepository(REPOSITORY),
    branch: BRANCH,
    path: PATH_FILTER,
  };
}

function getFirstLine(value: unknown) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
}

function mapGithubCommit(item: GithubCommitPayload): CommitHistoryItem | null {
  const sha = String(item.sha ?? "").trim();
  const committedAt = String(item.commit?.author?.date ?? "").trim();
  const title = getFirstLine(item.commit?.message);

  if (!sha || !committedAt || !title) {
    return null;
  }

  const authorName = String(
    item.author?.login ?? item.commit?.author?.name ?? "Unknown author",
  );
  const shortSha = sha.slice(0, 7);

  return {
    id: sha,
    sha,
    shortSha,
    title,
    message: `${authorName} committed ${shortSha}`,
    authorName: String(item.commit?.author?.name ?? authorName),
    authorUsername: String(item.author?.login ?? ""),
    authorAvatarUrl:
      typeof item.author?.avatar_url === "string"
        ? item.author.avatar_url
        : null,
    url: String(item.html_url ?? ""),
    committedAt,
  };
}

async function fetchCommitHistory() {
  const config = getCommitHistoryConfig();
  const [owner, repo] = config.repository.split("/");

  if (!owner || !repo) {
    throw new Error(
      "Commit history repository must use the owner/repository format",
    );
  }

  const url = new URL(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits`,
  );
  url.searchParams.set("sha", config.branch);
  url.searchParams.set("per_page", String(MAX_COMMITS));
  if (config.path) {
    url.searchParams.set("path", config.path);
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Doktainer",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const response = await fetch(url, { headers });
  const text = await response.text();

  if (!response.ok) {
    let message = text.trim();
    try {
      const payload = JSON.parse(text) as { message?: unknown };
      message = String(payload.message ?? message);
    } catch {
      // Keep the plain response body.
    }
    throw new Error(
      message || `GitHub request failed with status ${response.status}`,
    );
  }

  const payload = JSON.parse(text) as unknown;
  const commits = Array.isArray(payload)
    ? payload
        .map((item) => mapGithubCommit(item as GithubCommitPayload))
        .filter((item): item is CommitHistoryItem => Boolean(item))
    : [];

  return {
    success: true as const,
    data: commits,
    meta: {
      repository: config.repository,
      branch: config.branch,
      path: config.path,
    },
  };
}

export async function commitHistoryRoutes(app: FastifyInstance) {
  app.get("/commits", { preHandler: authenticate }, async (_req, reply) => {
    try {
      if (cache && cache.expiresAt > Date.now()) {
        return cache.payload;
      }

      const payload = await fetchCommitHistory();
      cache = {
        expiresAt: Date.now() + CACHE_TTL_MS,
        payload,
      };

      return payload;
    } catch (error) {
      reply.status(502).send({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load commit history",
      });
    }
  });
}
