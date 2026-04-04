import { z } from "zod";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  createProject,
  getProjects,
  getProjectsPartial,
} from "@/lib/data/server";
import { toErrorResponse } from "@/lib/api/error-response";

const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required"),
});

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");

    if (limit) {
      const parsedLimit = z.coerce
        .number()
        .int()
        .positive()
        .max(50)
        .parse(limit);

      const projects = await getProjectsPartial(user.id, parsedLimit);
      return NextResponse.json(projects);
    }

    const projects = await getProjects(user.id);
    return NextResponse.json(projects);
  } catch (error) {
    return toErrorResponse(error, "Unable to load projects");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { name } = createProjectSchema.parse(body);
    const project = await createProject(user.id, name);

    return NextResponse.json(project);
  } catch (error) {
    return toErrorResponse(error, "Unable to create project");
  }
}
