import { GitBookAPI } from "@gitbook/api";
import { configDotenv } from "dotenv";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import {
  loadSpacesFromFile,
  fetchSpaces,
  saveSpacesToFile,
  getOrgId,
} from "./utils";

configDotenv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outDir = path.join(__dirname, "../out");

const gitBookApiToken = process.env.GITBOOK_IMPORT_API_TOKEN;
const gitHubApiToken = process.env.GITHUB_API_TOKEN;
const branchName = process.env.GITHUB_BRANCH;

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

const client = new GitBookAPI({ authToken: gitBookApiToken });

const deleteSpace = async (spaceId: string) => {
  try {
    await client.spaces.deleteSpaceById(spaceId);
    console.log(`Space "${spaceId}" has been deleted.`);
  } catch (error) {
    console.error(`Error deleting space "${spaceId}":`, error.message || error);
  }
};

const deleteAction = async () => {
  const spaces = await fetchSpaces(client);

  if (spaces && spaces.length > 0) {
    const orgId = await getOrgId(client);
    if (orgId) {
      for (const { id: spaceId, title: spaceTitle } of spaces) {
        await deleteSpace(spaceId);
        console.log(`Deleted space: ${spaceTitle}`);
      }
    }
  } else {
    console.log("No spaces found.");
  }
};

deleteAction();

export default deleteAction;
