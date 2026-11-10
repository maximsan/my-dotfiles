#!/usr/bin/env node
/**
 * Refuses branch names outside `<type>/<lowercase-with-dashes>`, such as `fix/login-retry`, in maximsan's GitHub repos.
 * Git runs it in every repo through hook entries in the global .gitconfig:
 *   creating: the hook git runs when any tool creates or changes a branch (reference-transaction)
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
const ORIGIN = "origin";

/** The first argument the hook entries in .gitconfig pass: which check to run. */
const MODE = { creating: "creating", pushing: "pushing" };

/** The reference-transaction run just before git saves a change. .gitconfig also skips node for every other run. */
const PREPARED_STATE = "prepared";

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
 * @param {(name: string) => boolean} alreadyExists whether the branch exists here or on GitHub. Git's ref clean-up,
 *   `git pack-refs`, reports existing branches as new, and a branch GitHub already has may be checked out.
 */
export const refusedWhenCreating = (input, alreadyExists) =>
  createdBranches(input, { oldCommit: 0, newCommit: 1, ref: 2 }).filter(
    (name) => !ALLOWED_LOCALLY.test(name) && !isConventional(name) && !alreadyExists(name),
  );

/** The names a push refuses. Its input lines are `<local ref> <local id> <remote ref> <remote id>`. */
export const refusedWhenPushing = (input) =>
  createdBranches(input, { oldCommit: 3, newCommit: 1, ref: 2 }).filter(
    (name) => !ALLOWED_ON_PUSH.test(name) && !isConventional(name),
  );

const refusalMessage = (name) =>
  `Branch name '${name}' breaks the naming rule. Use a lowercase-with-dashes name starting with one of: ` +
  `${BRANCH_TYPES.join(", ")}, then a slash. Example: fix/login-retry.`;

const gitOutput = (args) => {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
};

const branchAlreadyExists = (name) =>
  gitOutput(["show-ref", "--verify", `${BRANCH_PREFIX}${name}`]) !== null ||
  gitOutput(["show-ref", "--verify", `refs/remotes/${ORIGIN}/${name}`]) !== null;

/** The names this run refuses, from the hook's arguments and input. */
const refusedNames = ([mode, ...hookArguments], input) => {
  if (mode === MODE.creating) {
    const [state] = hookArguments;

    if (state !== PREPARED_STATE || !OWNER_REPO_URL.test(gitOutput(["remote", "get-url", ORIGIN]) ?? "")) {
      return [];
    }

    return refusedWhenCreating(input, branchAlreadyExists);
  }

  if (mode === MODE.pushing) {
    const [remoteName, remoteUrl] = hookArguments;

    return OWNER_REPO_URL.test(remoteUrl ?? "") ? refusedWhenPushing(input) : [];
  }

  return [];
};

const [, scriptPath, ...hookArguments] = process.argv;
const isRunDirectly = scriptPath && realpathSync(scriptPath) === fileURLToPath(import.meta.url);

if (isRunDirectly) {
  // A failure in this script must never stop git: only a refused name does.
  try {
    // Read all input in every case: git writes it whether or not the hook needs it.
    const [firstRefused] = refusedNames(hookArguments, readFileSync(0, "utf8"));

    if (firstRefused) {
      console.error(refusalMessage(firstRefused));
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`branch-name-rule: skipped the check. ${error.message}`);
  }
}
