import { Api, GitBookAPI } from "@gitbook/api";
import { loadSpacesFromFile, fetchSpaces, saveSpacesToFile } from "./utils";

const exportContentToGitRepo = async (
  client: Api<GitBookAPI>,
  spaceId: string,
  spaceTitle: any,
  spaceLocation: any,
  githubRepoUrl: string,
  branchName: string
) => {
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

const exportAction = async (
  client: Api<GitBookAPI>,
  outDir: string,
  githubRepoUrl: string,
  branchName: string
) => {
  let spaces = loadSpacesFromFile(outDir);
   
  if (!spaces) {
    spaces = await fetchSpaces(client);
    if (spaces.length > 0) {
      saveSpacesToFile(spaces, outDir);
    }
  }

  if (spaces && spaces.length > 0) {
    for (const { id: spaceId, title: spaceTitle } of spaces) {
      console.log(`Exporting content for space: ${spaceTitle}`);
      await exportContentToGitRepo(
        client,
        spaceId,
        spaceTitle,
        spaceTitle,
        githubRepoUrl,
        branchName
      );
    }
  } else {
    console.log("No spaces found.");
  }
};

export default exportAction;
