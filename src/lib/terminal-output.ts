const OSC_SEQUENCE = /\u001B\][\s\S]*?(?:\u0007|\u001B\\)/g;
const DCS_AND_STRING_CONTROLS = /\u001B[P^_X][\s\S]*?\u001B\\/g;
const ANSI_ESCAPE_SEQUENCE = /\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;
const UNSAFE_LOG_CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001A\u001C-\u001F\u007F]/g;
const UNSAFE_TERMINAL_STREAM_CONTROL_CHARACTERS =
  /[\u0000-\u0007\u000B\u000C\u000E-\u001A\u001C-\u001F]/g;

function stripDangerousControlStrings(
  value: string,
  unsafeControlCharacters: RegExp,
): string {
  return value
    .replace(OSC_SEQUENCE, "")
    .replace(DCS_AND_STRING_CONTROLS, "")
    .replace(unsafeControlCharacters, "");
}

export function sanitizeTerminalStreamChunk(value: string): string {
  return stripDangerousControlStrings(
    value,
    UNSAFE_TERMINAL_STREAM_CONTROL_CHARACTERS,
  );
}

export function sanitizeLogText(value: string): string {
  return stripDangerousControlStrings(
    value,
    UNSAFE_LOG_CONTROL_CHARACTERS,
  ).replace(ANSI_ESCAPE_SEQUENCE, "");
}
