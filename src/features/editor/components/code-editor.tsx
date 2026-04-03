import { useEffect, useEffectEvent, useMemo, useRef } from "react"
import { EditorView, keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { indentationMarkers } from "@replit/codemirror-indentation-markers";
import { useTheme } from "next-themes";

import { minimap } from "../extensions/minimap";
import { getCodeMirrorTheme } from "../extensions/theme";
import { getLanguageExtension } from "../extensions/language-extension";
import { customSetup } from "../extensions/custom-setup";
import { suggestion } from "../extensions/suggestion";
import { quickEdit } from "../extensions/quick-edit";
import { selectionTooltip } from "../extensions/selection-tooltip";

interface Props {
  fileName: string;
  initialValue?: string;
  onChange: (value: string) => void;
}

export const CodeEditor = ({ 
  fileName, 
  initialValue = "",
  onChange
}: Props) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { resolvedTheme } = useTheme();

  const languageExtension = useMemo(() => {
    return getLanguageExtension(fileName)
  }, [fileName])

  const codeMirrorTheme = useMemo(
    () => getCodeMirrorTheme(resolvedTheme === "light" ? "light" : "dark"),
    [resolvedTheme]
  );

  const handleChange = useEffectEvent((value: string) => {
    onChange(value);
  });

  useEffect(() => {
    if (!editorRef.current) return;

    const view = new EditorView({
      doc: initialValue,
      parent: editorRef.current,
      extensions: [
        ...codeMirrorTheme,
        customSetup,
        languageExtension,
        suggestion(fileName),
        quickEdit(),
        selectionTooltip(),
        keymap.of([indentWithTab]),
        minimap(),
        indentationMarkers(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            handleChange(update.state.doc.toString());
          }
        })
      ],
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialValue is only used for initial document
  }, [codeMirrorTheme, fileName, handleChange, initialValue, languageExtension]);

  return (
    <div ref={editorRef} className="size-full bg-editor-pane pl-4" />
  );
};
