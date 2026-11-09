#!/usr/bin/env node
/**
 * Refuses branch names outside `<type>/<lowercase-with-dashes>`, such as `fix/login-retry`, in maximsan's GitHub repos.
 * Git runs it in every repo through hook entries in the global .gitconfig:
 *   creating: the reference-transaction hook, when any tool creates a local branch
 *   pushing:  the pre-push hook, when a new branch would reach GitHub
 * `git branch -m` skips reference-transaction, so only the push check catches a rename.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BRANCH_TYPES = ["feat", "fix", "chore", "docs", "refactor", "test", "prototype", "research"];
const CONVENTIONAL_NAME = new RegExp(`^(${BRANCH_TYPES.join("|")})/[a-z0-9]+([-.][a-z0-9]+)*$`);
const OWNER_REPO_URL = /github\.com[:/]maximsan\//;

/** Git writes an all-zero commit id for a ref that doesn't exist. */
const NO_COMMIT = /^0+$/;

const BRANCH_PREFIX = "refs/heads/";

/** Claude Code names its worktree branches worktree-*. They may exist locally, but the push check refuses them. */
const ALLOWED_LOCALLY = /^(main|master|worktree-.*)$/;
const ALLOWED_ON_PUSH = /^(main|master)$/;

export const isConventional = (name) => CONVENTIONAL_NAME.test(name);

const isCreation = (oldCommit, newCommit) => NO_COMMIT.test(oldCommit) && !NO_COMMIT.test(newCommit);

/** The branch names a hook's input creates. `columns` names where the old id, new id and ref sit in each line. */
const createdBranches = (input, columns) =>
  input
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const fields = line.split(" ");

      return { oldCommit: fields[columns.oldCommit], newCommit: fields[columns.newCommit], ref: fields[columns.ref] };
    })
    .filter(({ oldCommit, newCommit, ref }) => ref?.startsWith(BRANCH_PREFIX) && isCreation(oldCommit, newCommit))
    .map(({ ref }) => ref.slice(BRANCH_PREFIX.length));

/**
 * The names a reference-transaction refuses. Its input lines are `<old id> <new id> <ref>`.
 * @param {string} input what git wrote to the hook
 * @param {(name: string) => boolean} existsOnOrigin whether GitHub already has the branch, which may be checked out
 */
export const refusedWhenCreating = (input, existsOnOrigin) =>
  createdBranches(input, { oldCommit: 0, newCommit: 1, ref: 2 }).filter(
    (name) => !ALLOWED_LOCALLY.test(name) && !isConventional(name) && !existsOnOrigin(name),
  );

/** The names a push refuses. Its input lines are `<local ref> <local id> <remote ref> <remote id>`. */
export const refusedWhenPushing = (input) =>
  createdBranches(input, { oldCommit: 3, newCommit: 1, ref: 2 }).filter(
    (name) => !ALLOWED_ON_PUSH.test(name) && !isConventional(name),
  );

export const refusal = (name) =>
  `Branch name '${name}' breaks the naming rule. Use a kebab-case name starting with one of: ` +
  `${BRANCH_TYPES.join(", ")}, then a slash. Example: fix/login-retry.`;

const gitOutput = (args) => {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
};

const branchExistsOnOrigin = (name) => gitOutput(["show-ref", "--verify", `refs/remotes/origin/${name}`]) !== null;

/** The names this run refuses, from the hook's arguments and input. */
const refusedNames = ([mode, ...hookArguments], input) => {
  if (mode === "creating") {
    const [state] = hookArguments;
    const isOwnersRepo = OWNER_REPO_URL.test(gitOutput(["remote", "get-url", "origin"]) ?? "");

    return state === "prepared" && isOwnersRepo ? refusedWhenCreating(input, branchExistsOnOrigin) : [];
  }

  if (mode === "pushing") {
    const [, remoteUrl] = hookArguments;

    return OWNER_REPO_URL.test(remoteUrl ?? "") ? refusedWhenPushing(input) : [];
  }

  return [];
};

const isRunDirectly = process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);

if (isRunDirectly) {
  // Read all input in every case: git writes it whether or not the hook needs it.
  const refused = refusedNames(process.argv.slice(2), readFileSync(0, "utf8"));

  if (refused.length > 0) {
    console.error(refusal(refused[0]));
    process.exitCode = 1;
  }
}
