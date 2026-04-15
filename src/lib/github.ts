const GITHUB_HOST = "github.com";

const normalizeGitHubUrlInput = (value: string) => {
  const trimmed = value.trim();

  if (trimmed.startsWith("git@github.com:")) {
    return `https://${GITHUB_HOST}/${trimmed.slice("git@github.com:".length)}`;
  }

  if (trimmed.startsWith("ssh://git@github.com/")) {
    return `https://${GITHUB_HOST}/${trimmed.slice("ssh://git@github.com/".length)}`;
  }

  return trimmed;
};

export const parseGitHubRepositoryUrl = (value: string) => {
  const normalizedValue = normalizeGitHubUrlInput(value);
  const parsedUrl = new URL(normalizedValue);
  const host = parsedUrl.hostname.replace(/^www\./, "").toLowerCase();

  if (host !== GITHUB_HOST) {
    throw new Error("Invalid GitHub URL");
  }

  const [owner, repo, ...rest] = parsedUrl.pathname
    .split("/")
    .filter(Boolean);

  if (!owner || !repo || rest.length > 0) {
    throw new Error("Invalid GitHub URL");
  }

  const repoName = repo.replace(/\.git$/i, "");

  if (!repoName) {
    throw new Error("Invalid GitHub URL");
  }

  return { owner, repo: repoName };
};
