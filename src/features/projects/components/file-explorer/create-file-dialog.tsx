"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FILE_TEMPLATES } from "@/lib/project-files";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Id } from "../../../../../convex/_generated/dataModel";
import { useCreateFile } from "../../hooks/use-files";
import { useEditor } from "@/features/editor/hooks/use-editor";

interface CreateFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: Id<"projects">;
  parentId?: Id<"files">;
}

export const CreateFileDialog = ({
  open,
  onOpenChange,
  projectId,
  parentId,
}: CreateFileDialogProps) => {
  const createFile = useCreateFile();
  const { openFile } = useEditor(projectId);

  const [templateId, setTemplateId] = useState(FILE_TEMPLATES[0].id);
  const [fileName, setFileName] = useState(FILE_TEMPLATES[0].defaultName);
  const [starterContent, setStarterContent] = useState(
    FILE_TEMPLATES[0].starterContent,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  const selectedTemplate = useMemo(() => {
    return (
      FILE_TEMPLATES.find((template) => template.id === templateId) ??
      FILE_TEMPLATES[0]
    );
  }, [templateId]);

  useEffect(() => {
    if (!open) {
      setTemplateId(FILE_TEMPLATES[0].id);
      setFileName(FILE_TEMPLATES[0].defaultName);
      setStarterContent(FILE_TEMPLATES[0].starterContent);
      setIsSubmitting(false);
      setNameTouched(false);
      return;
    }

    setStarterContent(selectedTemplate.starterContent);

    if (!nameTouched) {
      setFileName(selectedTemplate.defaultName);
    }
  }, [nameTouched, open, selectedTemplate]);

  const handleCreate = async () => {
    const trimmedName = fileName.trim();
    if (!trimmedName) {
      return;
    }

    setIsSubmitting(true);

    try {
      const fileId = await createFile({
        projectId,
        parentId,
        name: trimmedName,
        content: starterContent,
      });

      onOpenChange(false);

      if (fileId) {
        openFile(fileId, { pinned: true });
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message.replace(/^Uncaught Error:\s*/, "")
          : "Unable to create file",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-panel-border bg-panel sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a file</DialogTitle>
          <DialogDescription>
            Pick a starter language or create a completely custom file with any
            name and extension you want.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="file-template"
            >
              Starter
            </label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger id="file-template">
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {FILE_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Language: {selectedTemplate.language}
            </p>
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="file-name"
            >
              File name
            </label>
            <Input
              id="file-name"
              value={fileName}
              onChange={(event) => {
                setNameTouched(true);
                setFileName(event.target.value);
              }}
              placeholder="main.py"
            />
            <p className="text-xs text-muted-foreground">
              You can override the suggested name with any custom extension.
            </p>
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="starter-content"
            >
              Starter content
            </label>
            <Textarea
              id="starter-content"
              value={starterContent}
              onChange={(event) => setStarterContent(event.target.value)}
              rows={12}
              className="font-mono text-xs"
              placeholder="Start with a blank file or tweak the starter template."
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!fileName.trim() || isSubmitting}
            onClick={() => void handleCreate()}
          >
            {isSubmitting ? "Creating..." : "Create file"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
