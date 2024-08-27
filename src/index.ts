import { Api, GitBookAPI } from "@gitbook/api";
import { configDotenv } from "dotenv";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import exportAction from "./export";
import importAction from "./import";

configDotenv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outDir = path.join(__dirname, "../out");

const gitBookApiToken = process.env.GITBOOK_EXPORT_API_TOKEN;
const gitHubApiToken = process.env.GITHUB_API_TOKEN;
const branchName = process.env.GITHUB_BRANCH || "main"; // necessary, and the branch should exist

const gitRepoUrl = (process.env.GITHUB_REPOSITORY || "").replace(
  /^https?:\/\//,
  ""
);

const githubRepoUrl = `https://${gitHubApiToken}@${gitRepoUrl}`;

if (!gitBookApiToken || !gitHubApiToken) {
  throw new Error("Missing API tokens in environment variables.");
}

if (!githubRepoUrl) {
  throw new Error("Missing GitHub repository URL in environment variables.");
}

const client = new GitBookAPI({
  authToken: gitBookApiToken,
});

let fn: any = () =>
  new Promise<unknown>((resolve) => {
    resolve(null);
  });

const call = async (fn: any) => {
  fn(client, outDir, gitRepoUrl, branchName)
    .catch((error: { message: any }) => {
      console.error(
        "An unexpected error occurred in the script:",
        error.message || error
      );
    })
    .finally(() => {
      console.info("Operation completed.");
    });
};

call(fn);

// call(importAction);
call(importAction);
// call();
