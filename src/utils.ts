import { Api, GitBookAPI } from "@gitbook/api";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const getOrgId = async (client: Api<GitBookAPI>) => {
  const {
    data: { items: orgsArr },
  } = await client.orgs.listOrganizationsForAuthenticatedUser();

  if (!orgsArr.length) {
    throw new Error("No organizations found for the authenticated user.");
  }

  if (orgsArr.length > 0) {
    return orgsArr[0]?.id;
  }
};

const fetchSpaces = async (client: Api<GitBookAPI>) => {
  try {
    const orgId = await getOrgId(client);
    if (orgId) {
      const {
        data: { items: spacesArr },
      } = await client.orgs.listSpacesInOrganizationById(orgId, {
        limit: 1000,
      });
      return spacesArr;
    }
    return [];
  } catch (error) {
    console.error("Error fetching spaces:", error.message || error);
    return [];
  }
};

const loadSpacesFromFile = (outDir: string) => {
  try {
    const data = readFileSync(path.join(outDir, "spaces.json"), "utf-8");
    console.log("Loaded spaces from local file.");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading spaces.json file:", error.message || error);
    return null;
  }
};

const saveSpacesToFile = (spaces: any, outDir: string) => {
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
    console.log("Directory created successfully!");
  } else {
    console.log("Directory already exists.");
  }
  writeFileSync(path.join(outDir, "spaces.json"), JSON.stringify(spaces));
  console.log("Downloaded and saved spaces to local file.");
};

export { saveSpacesToFile, existsSync, fetchSpaces, loadSpacesFromFile , getOrgId};
