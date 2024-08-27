import { GitBookAPI } from "@gitbook/api";
import { configDotenv } from "dotenv";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

configDotenv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outDir = path.join(__dirname, "out");

const gitBookApiToken = process.env.GITBOOK_API_TOKEN;
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

const fetchSpaces = async () => {
  try {
    const {
      data: { items: orgsArr },
    } = await client.orgs.listOrganizationsForAuthenticatedUser();

    if (!orgsArr.length)
      throw new Error("No organizations found for the authenticated user.");

    const {
      data: { items: spacesArr },
    } = await client.orgs.listSpacesInOrganizationById(orgsArr[0]?.id, {
      limit: 1000,
    });
    console.log(spacesArr);
    return spacesArr;
  } catch (error) {
    console.error("Error fetching spaces:", error.message || error);
    return [];
  }
};

const loadSpacesFromFile = () => {
  try {
    const data = readFileSync(path.join(outDir, "spaces.json"), "utf-8");
    console.log("Loaded spaces from local file.");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading spaces.json file:", error.message || error);
    return null;
  }
};

const saveSpacesToFile = (spaces) => {
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
    console.log("Directory created successfully!");
  } else {
    console.log("Directory already exists.");
  }
  writeFileSync(path.join(outDir, "spaces.json"), JSON.stringify(spaces));
  console.log("Downloaded and saved spaces to local file.");
};

const exportContentToGitRepo = async (spaceId, spaceTitle, spaceLocation) => {
  try {
    const commitMessage = `Update to ${spaceTitle}`;
    await client.spaces.exportToGitRepository(spaceId, {
      url: githubRepoUrl,
      ref: `refs/heads/${branchName}`,
      commitMessage: commitMessage,
      repoProjectDirectory: spaceLocation,
      gitInfo: {
        provider: "github",
        url: githubRepoUrl,
      },
    });

    console.log(
      `Content from space "${spaceTitle}" has been exported to the Git repository at ${githubRepoUrl}.`
    );
  } catch (error) {
    console.error(
      `Error exporting content for space "${spaceTitle}" to Git repository:`,
      error.message || error
    );
  }
};

const main = async () => {
  let spaces = loadSpacesFromFile();

  if (!spaces) {
    spaces = await fetchSpaces();
    if (spaces.length > 0) {
      saveSpacesToFile(spaces);
    }
  }

  if (spaces && spaces.length > 0) {
    for (const { id: spaceId, title: spaceTitle } of spaces) {
      console.log(`Exporting content for space: ${spaceTitle}`);
      await exportContentToGitRepo(spaceId, spaceTitle, spaceTitle);
    }
  } else {
    console.log("No spaces found.");
  }
};

main()
  .catch((error) => {
    console.error(
      "An unexpected error occurred in the script:",
      error.message || error
    );
  })
  .finally(() => {
    console.info("Operation completed.");
  });
