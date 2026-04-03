"use client";

import ky, { HTTPError } from "ky";
import { cloneElement, MouseEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderIcon } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Id } from "../../../../convex/_generated/dataModel";

interface DeleteProjectButtonProps {
  projectId: Id<"projects">;
  projectName: string;
  onDeleted?: () => void;
  redirectTo?: string;
  trigger: React.ReactElement<{
    onClick?: (event: MouseEvent<HTMLElement>) => void;
  }>;
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof HTTPError) {
    return error.response
      .json<{ error?: string }>()
      .then((body) => body.error || "Unable to delete project")
      .catch(() => "Unable to delete project");
  }

  if (error instanceof Error) {
    return error.message.replace(/^Uncaught Error:\s*/, "");
  }

  return "Unable to delete project";
};

export const DeleteProjectButton = ({
  projectId,
  projectName,
  onDeleted,
  redirectTo,
  trigger,
}: DeleteProjectButtonProps) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(true);

    trigger.props.onClick?.(event as never);
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await ky.post("/api/projects/delete", {
        json: { projectId },
      });
      setOpen(false);
      toast.success(`Deleted ${projectName}`);
      onDeleted?.();

      if (redirectTo) {
        router.replace(redirectTo);
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.error(await getErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isDeleting) {
          setOpen(nextOpen);
        }
      }}
    >
      {cloneElement(trigger, {
        onClick: handleOpen,
      })}
      <AlertDialogContent className="border-panel-border bg-panel">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this project?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove <span className="font-semibold text-foreground">{projectName}</span>, including its files,
            conversations, and generated workspace data. Any in-flight AI request for this project will be stopped first. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={(event) => {
              event.preventDefault();
              void handleDelete();
            }}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting ? <LoaderIcon className="size-4 animate-spin" /> : null}
            Delete project
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
