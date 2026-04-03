export type RunnableLanguage =
  | "javascript"
  | "python"
  | "c"
  | "cpp"
  | "java";

export type PreviewKind =
  | "html"
  | "markdown"
  | "image"
  | "svg"
  | "json"
  | "text";

export interface FileTemplate {
  id: string;
  label: string;
  language: string;
  defaultName: string;
  starterContent: string;
}

export const FILE_TEMPLATES: FileTemplate[] = [
  {
    id: "custom",
    label: "Custom file",
    language: "Custom",
    defaultName: "notes.txt",
    starterContent: "",
  },
  {
    id: "html",
    label: "HTML page",
    language: "HTML",
    defaultName: "index.html",
    starterContent: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Torq-AI Preview</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: system-ui, sans-serif;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top, rgba(56, 189, 248, 0.22), transparent 38%),
          #0f172a;
        color: white;
      }

      main {
        width: min(40rem, calc(100vw - 3rem));
        padding: 2rem;
        border-radius: 1.5rem;
        background: rgba(15, 23, 42, 0.72);
        border: 1px solid rgba(148, 163, 184, 0.24);
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.35);
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Hello from Torq-AI</h1>
      <p>Edit this file and open the Preview tab to see your page live.</p>
    </main>
  </body>
</html>
`,
  },
  {
    id: "markdown",
    label: "Markdown doc",
    language: "Markdown",
    defaultName: "README.md",
    starterContent: `# Torq-AI Notes

- Start writing here
- Open the Preview tab to render Markdown
`,
  },
  {
    id: "javascript",
    label: "JavaScript file",
    language: "JavaScript",
    defaultName: "main.js",
    starterContent: `function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("Torq-AI"));
`,
  },
  {
    id: "typescript",
    label: "TypeScript file",
    language: "TypeScript",
    defaultName: "main.ts",
    starterContent: `type User = {
  name: string;
};

const greet = (user: User) => \`Hello, \${user.name}!\`;

console.log(greet({ name: "Torq-AI" }));
`,
  },
  {
    id: "python",
    label: "Python script",
    language: "Python",
    defaultName: "main.py",
    starterContent: `def greet(name: str) -> str:
    return f"Hello, {name}!"


if __name__ == "__main__":
    print(greet("Torq-AI"))
`,
  },
  {
    id: "c",
    label: "C program",
    language: "C",
    defaultName: "main.c",
    starterContent: `#include <stdio.h>

int main(void) {
  printf("Hello from Torq-AI\\n");
  return 0;
}
`,
  },
  {
    id: "cpp",
    label: "C++ program",
    language: "C++",
    defaultName: "main.cpp",
    starterContent: `#include <iostream>

int main() {
  std::cout << "Hello from Torq-AI" << std::endl;
  return 0;
}
`,
  },
  {
    id: "java",
    label: "Java class",
    language: "Java",
    defaultName: "Main.java",
    starterContent: `public class Main {
  public static void main(String[] args) {
    System.out.println("Hello from Torq-AI");
  }
}
`,
  },
  {
    id: "css",
    label: "CSS stylesheet",
    language: "CSS",
    defaultName: "styles.css",
    starterContent: `:root {
  color-scheme: dark;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: system-ui, sans-serif;
}
`,
  },
  {
    id: "json",
    label: "JSON file",
    language: "JSON",
    defaultName: "data.json",
    starterContent: `{
  "name": "Torq-AI",
  "version": 1
}
`,
  },
];

const TEXT_PREVIEW_EXTENSIONS = new Set([
  "txt",
  "log",
  "csv",
  "yaml",
  "yml",
  "xml",
]);

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "ico",
  "avif",
]);

export const getFileExtension = (fileName: string) => {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
};

export const getPreviewKind = (fileName: string): PreviewKind | null => {
  const extension = getFileExtension(fileName);

  if (extension === "html" || extension === "htm") {
    return "html";
  }

  if (extension === "md" || extension === "mdx") {
    return "markdown";
  }

  if (extension === "svg") {
    return "svg";
  }

  if (IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }

  if (extension === "json") {
    return "json";
  }

  if (TEXT_PREVIEW_EXTENSIONS.has(extension)) {
    return "text";
  }

  return null;
};

export const getRunnableLanguage = (
  fileName: string,
): RunnableLanguage | null => {
  const extension = getFileExtension(fileName);

  switch (extension) {
    case "js":
    case "mjs":
    case "cjs":
      return "javascript";
    case "py":
      return "python";
    case "c":
      return "c";
    case "cc":
    case "cpp":
    case "cxx":
      return "cpp";
    case "java":
      return "java";
    default:
      return null;
  }
};

export const getRunnableLanguageLabel = (fileName: string) => {
  const language = getRunnableLanguage(fileName);

  switch (language) {
    case "javascript":
      return "JavaScript";
    case "python":
      return "Python";
    case "c":
      return "C";
    case "cpp":
      return "C++";
    case "java":
      return "Java";
    default:
      return null;
  }
};

export const getMimeType = (fileName: string) => {
  const extension = getFileExtension(fileName);

  switch (extension) {
    case "html":
    case "htm":
      return "text/html; charset=utf-8";
    case "css":
      return "text/css; charset=utf-8";
    case "js":
    case "mjs":
    case "cjs":
      return "application/javascript; charset=utf-8";
    case "json":
      return "application/json; charset=utf-8";
    case "md":
    case "mdx":
      return "text/markdown; charset=utf-8";
    case "svg":
      return "image/svg+xml";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "bmp":
      return "image/bmp";
    case "ico":
      return "image/x-icon";
    case "avif":
      return "image/avif";
    case "py":
    case "c":
    case "cc":
    case "cpp":
    case "cxx":
    case "java":
    case "ts":
    case "tsx":
      return "text/plain; charset=utf-8";
    default:
      return "text/plain; charset=utf-8";
  }
};
