import { spawn } from "node:child_process";
import { basename, join } from "node:path";

import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { convex } from "@/lib/convex-client";
import { getRunnableLanguage } from "@/lib/project-files";
import {
  cleanupMaterializedWorkspace,
  materializeProjectWorkspace,
} from "@/lib/server/project-workspace";

import { api } from "../../../../../convex/_generated/api";
import { Doc, Id } from "../../../../../convex/_generated/dataModel";

export const runtime = "nodejs";

const requestSchema = z.object({
  fileId: z.string(),
  projectId: z.string(),
});

type RunSpec =
  | {
      type: "spawn";
      command: string;
      args: string[];
      cwd: string;
      displayCommand: string;
    }
  | {
      type: "shell";
      command: string;
      cwd: string;
      displayCommand: string;
    };

const shellQuote = (value: string) => {
  return `'${value.replace(/'/g, `'\\''`)}'`;
};

const buildRunSpec = ({
  file,
  relativePath,
  rootDir,
  project,
  allFiles,
}: {
  file: Doc<"files">;
  relativePath: string;
  rootDir: string;
  project: Doc<"projects">;
  allFiles: Doc<"files">[];
}): RunSpec => {
  const customRunCommand = project.settings?.runCommand?.trim();

  if (customRunCommand) {
    const resolvedCommand = customRunCommand.replaceAll(
      "{file}",
      shellQuote(relativePath),
    );

    return {
      type: "shell",
      command: resolvedCommand,
      cwd: rootDir,
      displayCommand: resolvedCommand,
    };
  }

  const language = getRunnableLanguage(file.name);

  switch (language) {
    case "javascript":
      return {
        type: "spawn",
        command: "node",
        args: [relativePath],
        cwd: rootDir,
        displayCommand: `node ${relativePath}`,
      };
    case "python":
      return {
        type: "spawn",
        command: "python3",
        args: [relativePath],
        cwd: rootDir,
        displayCommand: `python3 ${relativePath}`,
      };
    case "c": {
      const outputName = basename(file.name, ".c");
      const outputPath = join(".torq-run", `${outputName}.out`);

      return {
        type: "shell",
        command: `mkdir -p .torq-run && gcc ${shellQuote(relativePath)} -o ${shellQuote(outputPath)} && ${shellQuote(join(rootDir, outputPath))}`,
        cwd: rootDir,
        displayCommand: `gcc ${relativePath} -o ${outputPath} && ${outputPath}`,
      };
    }
    case "cpp": {
      const outputName = basename(file.name).replace(/\.(cc|cpp|cxx)$/i, "");
      const outputPath = join(".torq-run", `${outputName}.out`);

      return {
        type: "shell",
        command: `mkdir -p .torq-run && g++ -std=c++17 ${shellQuote(relativePath)} -o ${shellQuote(outputPath)} && ${shellQuote(join(rootDir, outputPath))}`,
        cwd: rootDir,
        displayCommand: `g++ -std=c++17 ${relativePath} -o ${outputPath} && ${outputPath}`,
      };
    }
    case "java": {
      const javaFiles = allFiles
        .filter((candidate) => candidate.type === "file" && /\.java$/i.test(candidate.name))
        .map((candidate) => candidate._id);

      const packageMatch = file.content?.match(/^\s*package\s+([\w.]+)\s*;/m);
      const className = basename(file.name, ".java");
      const mainClass = packageMatch ? `${packageMatch[1]}.${className}` : className;
      const compileTargets = javaFiles
        .map((id) => allFiles.find((candidate) => candidate._id === id))
        .filter((candidate): candidate is Doc<"files"> => Boolean(candidate))
        .map((candidate) => candidate._id);

      const fileArguments = compileTargets
        .map((id) => {
          const relative = id === file._id ? relativePath : undefined;
          if (relative) {
            return shellQuote(relative);
          }
          const sibling = allFiles.find((candidate) => candidate._id === id);
          if (!sibling) {
            return null;
          }

          const siblingParts = [sibling.name];
          let parentId = sibling.parentId;
          while (parentId) {
            const parent = allFiles.find((candidate) => candidate._id === parentId);
            if (!parent) {
              break;
            }
            siblingParts.unshift(parent.name);
            parentId = parent.parentId;
          }

          return shellQuote(siblingParts.join("/"));
        })
        .filter((value): value is string => Boolean(value));

      return {
        type: "shell",
        command: `javac ${fileArguments.join(" ")} && java -cp ${shellQuote(rootDir)} ${shellQuote(mainClass)}`,
        cwd: rootDir,
        displayCommand: `javac ${fileArguments.map((value) => value.replaceAll("'", "")).join(" ")} && java -cp . ${mainClass}`,
      };
    }
    default:
      throw new Error(`Running ${file.name} is not supported yet.`);
  }
};

const runProcess = (spec: RunSpec) => {
  return new Promise<{
    exitCode: number | null;
    output: string;
    timedOut: boolean;
  }>((resolve, reject) => {
    const child =
      spec.type === "spawn"
        ? spawn(spec.command, spec.args, {
            cwd: spec.cwd,
            env: process.env,
          })
        : spawn(spec.command, {
            cwd: spec.cwd,
            env: process.env,
            shell: true,
          });

    let output = "";
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, 20_000);

    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      resolve({ exitCode, output, timedOut });
    });
  });
};

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const internalKey = process.env.TORQ_AI_CONVEX_INTERNAL_KEY;
  if (!internalKey) {
    return NextResponse.json(
      { error: "Internal key not configured" },
      { status: 500 },
    );
  }

  const body = await request.json();
  const { projectId, fileId } = requestSchema.parse(body);

  const project = await convex.query(api.system.getProjectById, {
    internalKey,
    projectId: projectId as Id<"projects">,
  });

  if (!project || project.ownerId !== userId) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const files = await convex.query(api.system.getProjectFilesWithUrls, {
    internalKey,
    projectId: projectId as Id<"projects">,
  });

  const file = files.find((candidate) => candidate._id === fileId);
  if (!file || file.type !== "file") {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (file.storageId) {
    return NextResponse.json(
      { error: "Binary files cannot be run directly." },
      { status: 400 },
    );
  }

  try {
    const { rootDir, filePathsById } = await materializeProjectWorkspace(
      projectId as Id<"projects">,
      files,
    );

    try {
      const relativePath = filePathsById.get(file._id);
      if (!relativePath) {
        return NextResponse.json({ error: "File path not found" }, { status: 404 });
      }

      const spec = buildRunSpec({
        file,
        relativePath,
        rootDir,
        project,
        allFiles: files,
      });

      const result = await runProcess(spec);

      const output = result.output.trim().length > 0
        ? result.output
        : result.exitCode === 0
          ? "Process finished without output."
          : "Process exited without output.";

      const statusCode = result.timedOut ? 408 : result.exitCode === 0 ? 200 : 400;

      return NextResponse.json(
        {
          command: spec.displayCommand,
          exitCode: result.exitCode,
          output,
          timedOut: result.timedOut,
        },
        { status: statusCode },
      );
    } finally {
      await cleanupMaterializedWorkspace(rootDir);
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.replace(/^Uncaught Error:\s*/, "")
        : "Unable to run this file.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
