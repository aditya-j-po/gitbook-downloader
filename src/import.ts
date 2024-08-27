import { GitBookAPI, ImportContentSource } from "@gitbook/api";
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
const branchName = process.env.GITHUB_BRANCH; // necessary, and the branch should exist

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

const importContentFromGitRepo = async (
  orgId: string,
  spaceId: string,
  spaceTitle: any,
  spaceLocation: any,
  parentId: string | undefined,
  parentMap: Map<string, Record<string, string | undefined>>
) => {
  try {
    const {
      data: { id: spaceIdLocal },
    } = await client.orgs.createSpace(orgId, {
      title: spaceTitle,
      parent: parentId,
    });

    const found = parentMap.get(spaceId);
    if (found) {
      found["new"] = spaceIdLocal;
    }

    console.log("created space", spaceIdLocal);
    await client.spaces.importContent(spaceIdLocal, {
      url: `${githubRepoUrl}/${spaceTitle}`,
      source: ImportContentSource.Markdown,
      // ref: `refs/heads/${branchName}`,
      // repoProjectDirectory: spaceLocation?.replace(parentId, spaceId),
      // gitInfo: {
      //   provider: "github",
      //   url: githubRepoUrl,
      // },
      // standalone: true,
    });

    console.log(
      `Content from space "${spaceTitle}" has been imported to the Gitbook.`
    );
  } catch (error) {
    console.error(
      `Error importing content for space "${spaceTitle}" to Git repository:`,
      error.message || error
    );
  }
};

const importAction = async () => {
  let spaces: any[] = loadSpacesFromFile(outDir);
  let parentMap = new Map<string, Record<string, string>>();

  if (!spaces) {
    spaces = await fetchSpaces(client);
    if (spaces.length > 0) {
      saveSpacesToFile(spaces, outDir);
    }
  }

  spaces.forEach((space) => {
    parentMap.set(space.id, { parent: space.parent, old: space.id });
  });

  // Second pass: Resolve parent references.
  spaces.forEach((space) => {
    if (space.parent) {
      const parentEntry = parentMap.get(space.parent);
      if (parentEntry) {
        const found = parentMap.get(space.id);
        if (found) {
          found["parent"] = parentEntry.new;
        }
      }
    }
  });

  // spaces = spaces.slice(0, 1);
  if (spaces && spaces.length > 0) {
    const orgId = await getOrgId(client);
    for (const { id: spaceId, title: spaceTitle } of spaces) {
      const parentId = parentMap.get(spaceId)?.new;
      console.log("parent: " + parentId);
      if (orgId) {
        await importContentFromGitRepo(
          orgId,
          spaceId,
          spaceTitle,
          spaceTitle,
          parentId,
          parentMap
        );
        console.log(`Imported content for space: ${spaceTitle}`);
      }
    }
  } else {
    console.log("No spaces found.");
  }

  // console.log("pm", JSON.stringify(Object.fromEntries(parentMap)));
};

export default importAction;
