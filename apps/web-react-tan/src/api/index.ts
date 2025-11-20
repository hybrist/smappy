import { createServerFn } from "@tanstack/react-start";
import { createDatabase } from "@smappy/store";
import {
  listProjects,
  listAnalysisRuns,
  getAnalysisDetails as getAnalysisDetailsQuery,
  getAnalysisModules as getAnalysisModulesQuery,
  getAnalysisBundles as getAnalysisBundlesQuery,
  getAnalysisDependencyGraph as getAnalysisDependencyGraphQuery,
  getAnalysisTreemap as getAnalysisTreemapQuery,
} from "@smappy/store/queries";

import { seedDatabase } from "./seed";

const db = createDatabase({
  dbPath: process.env.DATABASE_URL || ":memory:",
}).db;

seedDatabase(db);

export const getProjects = createServerFn("GET", async () => {
  try {
    return listProjects(db);
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    throw new Error("Failed to fetch projects");
  }
});

export const getProjectAnalyses = createServerFn(
  "GET",
  async (projectName: string) => {
    try {
      return listAnalysisRuns(db, { projectName });
    } catch (error) {
      console.error(`Failed to fetch analyses for project "${projectName}":`, error);
      throw new Error(`Failed to fetch analyses for project "${projectName}"`);
    }
  }
);

export const getAnalysisDetails = createServerFn("GET", async (id: string) => {
  try {
    return getAnalysisDetailsQuery(db, parseInt(id));
  } catch (error) {
    console.error(`Failed to fetch analysis details for id "${id}":`, error);
    throw new Error(`Failed to fetch analysis details for id "${id}"`);
  }
});

export const getAnalysisModules = createServerFn(
  "GET",
  async (id: string, filters?: any) => {
    try {
      return getAnalysisModulesQuery(db, parseInt(id), filters);
    } catch (error) {
      console.error(`Failed to fetch analysis modules for id "${id}":`, error);
      throw new Error(`Failed to fetch analysis modules for id "${id}"`);
    }
  }
);

export const getAnalysisBundles = createServerFn("GET", async (id: string) => {
  try {
    return getAnalysisBundlesQuery(db, parseInt(id));
  } catch (error) {
    console.error(`Failed to fetch analysis bundles for id "${id}":`, error);
    throw new Error(`Failed to fetch analysis bundles for id "${id}"`);
  }
});

export const getAnalysisDependencyGraph = createServerFn(
  "GET",
  async (id: string) => {
    try {
      return getAnalysisDependencyGraphQuery(db, parseInt(id));
    } catch (error) {
      console.error(
        `Failed to fetch analysis dependency graph for id "${id}":`,
        error
      );
      throw new Error(
        `Failed to fetch analysis dependency graph for id "${id}"`
      );
    }
  }
);

export const getAnalysisTreemap = createServerFn("GET", async (id: string) => {
  try {
    return getAnalysisTreemapQuery(db, parseInt(id));
  } catch (error) {
    console.error(`Failed to fetch analysis treemap for id "${id}":`, error);
    throw new Error(`Failed to fetch analysis treemap for id "${id}"`);
  }
});
