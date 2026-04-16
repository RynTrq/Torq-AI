const SIMPLE_CHAT_MAX_LENGTH = 80;
const SIMPLE_CHAT_REGEX =
  /^(hi|hey|hello|yo|sup|thanks|thank you|ok|okay|cool|nice|good morning|good afternoon|good evening)[!. ]*$/i;
const PROJECT_ACTION_REGEX =
  /\b(create|make|generate|write|add|build|update|edit|modify|rewrite|refactor|rename|delete|remove|read|list|open|fix|implement)\b/i;
const PROJECT_TARGET_REGEX =
  /\b(file|folder|project|codebase|repository|repo|src\/|\.ts\b|\.tsx\b|\.js\b|\.jsx\b|\.py\b|\.java\b|\.cpp\b|\.c\b|\.html\b|\.css\b|\.json\b|\.md\b)\b/i;
const DIRECT_FILE_REQUEST_REGEX =
  /\b(?:give|send|output|return)\b[\s\S]{0,80}\b(?:file|files|folder)\b/i;

export const isSimpleChatMessage = (message: string) => {
  const trimmed = message.trim();

  return (
    trimmed.length > 0 &&
    trimmed.length <= SIMPLE_CHAT_MAX_LENGTH &&
    SIMPLE_CHAT_REGEX.test(trimmed)
  );
};

export const shouldUseToolNetwork = (message: string) =>
  (PROJECT_ACTION_REGEX.test(message) && PROJECT_TARGET_REGEX.test(message)) ||
  DIRECT_FILE_REQUEST_REGEX.test(message);
