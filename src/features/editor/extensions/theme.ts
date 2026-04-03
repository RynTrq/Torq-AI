import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

const sharedTheme = {
  "&": {
    outline: "none !important",
    height: "100%",
    backgroundColor: "var(--editor-pane)",
    color: "var(--editor-text)",
  },
  ".cm-content": {
    fontFamily: "var(--font-plex-mono), monospace",
    fontSize: "14px",
    caretColor: "var(--vscode-blue)",
  },
  ".cm-scroller": {
    scrollbarWidth: "thin",
    scrollbarColor: "#3f3f46 transparent",
  },
  ".cm-gutters": {
    minWidth: "56px",
    border: "none",
    backgroundColor: "var(--editor-gutter)",
    color: "var(--muted-foreground)",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--vscode-blue)",
  },
  ".cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "var(--editor-selection) !important",
  },
  ".cm-panels": {
    backgroundColor: "var(--workspace-panel)",
    color: "var(--foreground)",
    borderColor: "var(--workspace-border)",
  },
  ".cm-tooltip": {
    border: "1px solid var(--workspace-border)",
    backgroundColor: "var(--workspace-panel)",
    color: "var(--foreground)",
  },
};

const darkTheme = EditorView.theme(
  {
    ...sharedTheme,
    ".cm-activeLine, .cm-activeLineGutter": {
      backgroundColor: "#2a2d2e",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      color: "#6e7681",
    },
  },
  { dark: true }
);

const lightTheme = EditorView.theme(
  {
    ...sharedTheme,
    ".cm-activeLine, .cm-activeLineGutter": {
      backgroundColor: "#eef4ff",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      color: "#8b949e",
    },
  },
  { dark: false }
);

const darkHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#c586c0" },
  { tag: [tags.name, tags.deleted, tags.character, tags.propertyName], color: "#9cdcfe" },
  { tag: [tags.function(tags.variableName), tags.labelName], color: "#dcdcaa" },
  { tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)], color: "#4fc1ff" },
  { tag: [tags.definition(tags.name), tags.separator], color: "#d4d4d4" },
  { tag: [tags.className], color: "#4ec9b0" },
  { tag: [tags.number, tags.changed, tags.annotation, tags.modifier], color: "#b5cea8" },
  { tag: [tags.operator, tags.operatorKeyword], color: "#d4d4d4" },
  { tag: [tags.string, tags.special(tags.brace)], color: "#ce9178" },
  { tag: [tags.meta, tags.comment], color: "#6a9955", fontStyle: "italic" },
  { tag: tags.invalid, color: "#f14c4c" },
]);

const lightHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#af00db" },
  { tag: [tags.name, tags.deleted, tags.character, tags.propertyName], color: "#001080" },
  { tag: [tags.function(tags.variableName), tags.labelName], color: "#795e26" },
  { tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)], color: "#0070c1" },
  { tag: [tags.definition(tags.name), tags.separator], color: "#24292f" },
  { tag: [tags.className], color: "#267f99" },
  { tag: [tags.number, tags.changed, tags.annotation, tags.modifier], color: "#1750eb" },
  { tag: [tags.operator, tags.operatorKeyword], color: "#24292f" },
  { tag: [tags.string, tags.special(tags.brace)], color: "#a31515" },
  { tag: [tags.meta, tags.comment], color: "#008000", fontStyle: "italic" },
  { tag: tags.invalid, color: "#cf222e" },
]);

export const getCodeMirrorTheme = (mode: "dark" | "light") => [
  mode === "dark" ? darkTheme : lightTheme,
  syntaxHighlighting(mode === "dark" ? darkHighlight : lightHighlight),
];
