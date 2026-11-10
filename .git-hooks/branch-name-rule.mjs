#!/usr/bin/env node
/**
 * Refuses branch names outside `<type>/<lowercase-with-dashes>`, such as `fix/login-retry`, in maximsan's GitHub
 * repos. Git runs it in every repo through hook entries in the global .gitconfig:
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

/** Where each value sits in a line git writes to reference-transaction: `<old id> <new id> <ref>`. */
const CREATE_COLUMNS = { oldCommit: 0, newCommit: 1, ref: 2 };

/** Where each value sits in a line git writes to pre-push: `<local ref> <local id> <remote ref> <remote id>`. */
const PUSH_COLUMNS = { oldCommit: 3, newCommit: 1, ref: 2 };

/** Claude Code names its worktree branches worktree-*. They may exist locally, but the push check refuses them. */
const ALLOWED_LOCALLY = /^(main|master|worktree-.*)$/;
const ALLOWED_ON_PUSH = /^(main|master)$/;

/**
 * Whether a branch name follows the naming rule.
 * @param {string} name the branch name, without `refs/heads/`
 * @returns {boolean} true for a name such as `fix/login-retry`
 */
export const isConventional = (name) => CONVENTIONAL_NAME.test(name);

const isCreation = (oldCommit, newCommit) => NO_COMMIT.test(oldCommit) && !NO_COMMIT.test(newCommit);

/**
 * The branch names that a hook's input creates.
 * @param {string} input the lines git wrote to the hook
 * @param {{ oldCommit: number, newCommit: number, ref: number }} columns where each value sits in a line
 * @returns {string[]} the created branch names, without `refs/heads/`
 */
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
 * The names a reference-transaction refuses.
 * @param {string} input the lines git wrote to the hook
 * @param {(name: string) => boolean} alreadyExists whether the branch exists here or on GitHub. Git's ref clean-up,
 *   `git pack-refs`, reports existing branches as new, and a branch GitHub already has may be checked out.
 * @returns {string[]} the refused names, none when every name is allowed
 */
export const refusedWhenCreating = (input, alreadyExists) =>
  createdBranches(input, CREATE_COLUMNS).filter(
    (name) => !ALLOWED_LOCALLY.test(name) && !isConventional(name) && !alreadyExists(name),
  );

/**
 * The names a push refuses.
 * @param {string} input the lines git wrote to the hook
 * @returns {string[]} the refused names, none when every name is allowed
 */
export const refusedWhenPushing = (input) =>
  createdBranches(input, PUSH_COLUMNS).filter((name) => !ALLOWED_ON_PUSH.test(name) && !isConventional(name));

const refusalMessage = (name) =>
  `Branch name '${name}' breaks the naming rule. Use a lowercase-with-dashes name starting with one of: `
  + `${BRANCH_TYPES.join(", ")}, then a slash. Example: fix/login-retry.`;

const gitOutput = (args) => {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
};

const branchAlreadyExists = (name) =>
  gitOutput(["show-ref", "--verify", `${BRANCH_PREFIX}${name}`]) !== null
  || gitOutput(["show-ref", "--verify", `refs/remotes/${ORIGIN}/${name}`]) !== null;

/**
 * The names this run refuses.
 * @param {string[]} hookArguments the mode from .gitconfig, then what git passes: the transaction's state when
 *   creating, or the remote's name and URL when pushing
 * @param {string} input the lines git wrote to the hook
 * @returns {string[]} the refused names, none when every name is allowed
 */
const refusedNames = (hookArguments, input) => {
  const [mode, ...modeArguments] = hookArguments;

  if (mode === MODE.creating) {
    const [state] = modeArguments;

    if (state !== PREPARED_STATE || !OWNER_REPO_URL.test(gitOutput(["remote", "get-url", ORIGIN]) ?? "")) {
      return [];
    }

    return refusedWhenCreating(input, branchAlreadyExists);
  }

  if (mode === MODE.pushing) {
    // Git passes the remote's name first, then its URL.
    const [, remoteUrl] = modeArguments;

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

    if (firstRefused !== undefined) {
      console.error(refusalMessage(firstRefused));
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`branch-name-rule: skipped the check. ${error.message}`);
  }
}
