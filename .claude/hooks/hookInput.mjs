// What every hook shares: the event's JSON from stdin, the edited file's path
// relative to the repository, and a way to run a command and fail the hook.
// Exit 2 is the code Claude Code reads as "blocked, feed stderr back to
// Claude" (Claude Code docs, Hooks reference: exit codes).

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

/** The hook's JSON input; `{}` when stdin is empty. */
export function hookInput() {
  const raw = readFileSync(0, "utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

/** The tool's file path relative to the repository root, forward slashes; undefined when the call has none. */
export function editedFile(input) {
  const file = input.tool_input?.file_path;
  if (typeof file !== "string" || !file) return undefined;
  return relative(process.cwd(), resolve(process.cwd(), file)).split("\\").join("/");
}

/**
 * Runs a command with the repository's node_modules on PATH; returns its exit
 * status and combined output.
 * @param {string} command
 * @param {string[]} args
 * @param {NodeJS.ProcessEnv} [env]
 */
export function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: { ...process.env, PATH: `${resolve("node_modules/.bin")}:${process.env.PATH ?? ""}`, ...env },
  });
  return { status: result.status ?? 1, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

/** Blocks the action: the message reaches Claude as the reason. */
export function block(message) {
  process.stderr.write(`${message.trimEnd()}\n`);
  process.exit(2);
}
