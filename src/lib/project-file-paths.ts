interface ProjectPathNode {
  _id: string;
  parentId?: string;
  name: string;
}

const MAX_PATH_SEGMENT_LENGTH = 255;
const INVALID_PATH_SEGMENT_CHARS = /[\\/\0-\u001f\u007f]/;

export const normalizeProjectPathSegment = (name: string) => {
  const normalized = name.trim();

  if (!normalized) {
    throw new Error("Project item name is required");
  }

  if (normalized === "." || normalized === "..") {
    throw new Error("Project item name cannot be . or ..");
  }

  if (normalized.length > MAX_PATH_SEGMENT_LENGTH) {
    throw new Error(
      `Project item name must be ${MAX_PATH_SEGMENT_LENGTH} characters or fewer`,
    );
  }

  if (INVALID_PATH_SEGMENT_CHARS.test(normalized)) {
    throw new Error(
      "Project item name cannot contain slashes or control characters",
    );
  }

  return normalized;
};

export const getProjectPathParts = <T extends ProjectPathNode>(
  file: T,
  filesById: Map<string, T>,
) => {
  const parts: string[] = [];
  const visited = new Set<string>();
  let current: T | undefined = file;

  while (current) {
    if (visited.has(current._id)) {
      throw new Error(`Detected a cycle in project item "${current.name}"`);
    }

    visited.add(current._id);
    parts.unshift(normalizeProjectPathSegment(current.name));
    current = current.parentId ? filesById.get(current.parentId) : undefined;
  }

  return parts;
};

export const buildProjectFilePathMaps = <T extends ProjectPathNode>(files: T[]) => {
  const filesById = new Map(files.map((file) => [file._id, file]));
  const filesByPath = new Map<string, T>();
  const filePathsById = new Map<string, string>();

  for (const file of files) {
    const relativePath = getProjectPathParts(file, filesById).join("/");

    if (filesByPath.has(relativePath)) {
      throw new Error(`Duplicate project path detected: ${relativePath}`);
    }

    filesByPath.set(relativePath, file);
    filePathsById.set(file._id, relativePath);
  }

  return { filesById, filesByPath, filePathsById };
};
