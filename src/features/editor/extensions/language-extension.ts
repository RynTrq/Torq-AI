import { Extension } from "@codemirror/state";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";

export const getLanguageExtension = (filename: string): Extension => {
  const ext = filename.split(".").pop()?.toLowerCase();

  switch(ext) {
    case "js":
    case "cjs":
    case "mjs":
      return javascript();
    case "jsx":
      return javascript({ jsx: true });
    case "ts":
    case "cts":
    case "mts":
      return javascript({ typescript: true });
    case "tsx":
      return javascript({ typescript: true, jsx: true });
    case "c":
    case "cc":
    case "cpp":
    case "cxx":
    case "h":
    case "hh":
    case "hpp":
    case "hxx":
      return cpp();
    case "html":
      return html();
    case "css":
      return css();
    case "json":
      return json();
    case "md":
    case "mdx":
      return markdown();
    case "java":
      return java();
    case "py":
      return python();
    default:
      return [];
  }
};
