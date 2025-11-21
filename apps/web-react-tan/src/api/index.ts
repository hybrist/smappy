import { createServerFn } from "@tanstack/react-start";
// TODO: These server-only imports need proper SSR configuration
// @ts-ignore - Server-only imports
import { createDatabase } from "@smappy/store";
// @ts-ignore - Server-only imports
import {
  listProjects,
  listAnalysisRuns,
  getAnalysisDetails as getAnalysisDetailsQuery,
  getAnalysisModules as getAnalysisModulesQuery,
  getAnalysisBundles as getAnalysisBundlesQuery,
  getAnalysisDependencyGraph as getAnalysisDependencyGraphQuery,
  getAnalysisTreemap as getAnalysisTreemapQuery,
} from "@smappy/store/queries";

// @ts-ignore - Server-only imports
import { seedDatabase } from "./seed";

// @ts-ignore - Server-only code
const db = createDatabase({
  dbPath: process.env.DATABASE_URL || ":memory:",
}).db;

// @ts-ignore - Server-only code
seedDatabase(db);

export const getProjects = createServerFn({
  method: "GET",
}).handler(async () => {
  try {
    return listProjects(db);
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    throw new Error("Failed to fetch projects");
  }
});

export const getProjectAnalyses = createServerFn({
  method: "GET",
}).handler(async (projectName: string) => {
  try {
    return listAnalysisRuns(db, { projectName });
  } catch (error) {
    console.error(
      `Failed to fetch analyses for project "${projectName}":`,
      error,
    );
    throw new Error(`Failed to fetch analyses for project "${projectName}"`);
  }
});

export const getAnalysisDetails = createServerFn({
  method: "GET",
}).handler(async (id: string) => {
  const numericId = parseInt(id);
  if (isNaN(numericId)) {
    throw new Error(`Invalid analysis ID: "${id}"`);
  }
  try {
    return getAnalysisDetailsQuery(db, numericId);
  } catch (error) {
    console.error(`Failed to fetch analysis details for id "${id}":`, error);
    throw new Error(`Failed to fetch analysis details for id "${id}"`);
  }
});

export const getAnalysisModules = createServerFn({
  method: "GET",
}).handler(async (id: string, filters?: any) => {
  const numericId = parseInt(id);
  if (isNaN(numericId)) {
    throw new Error(`Invalid analysis ID: "${id}"`);
  }
  try {
    return getAnalysisModulesQuery(db, numericId, filters);
  } catch (error) {
    console.error(`Failed to fetch analysis modules for id "${id}":`, error);
    throw new Error(`Failed to fetch analysis modules for id "${id}"`);
  }
});

export const getAnalysisBundles = createServerFn({
  method: "GET",
}).handler(async (id: string) => {
  const numericId = parseInt(id);
  if (isNaN(numericId)) {
    throw new Error(`Invalid analysis ID: "${id}"`);
  }
  try {
    return getAnalysisBundlesQuery(db, numericId);
  } catch (error) {
    console.error(`Failed to fetch analysis bundles for id "${id}":`, error);
    throw new Error(`Failed to fetch analysis bundles for id "${id}"`);
  }
});

export const getAnalysisDependencyGraph = createServerFn({
  method: "GET",
}).handler(async (id: string) => {
  const numericId = parseInt(id);
  if (isNaN(numericId)) {
    throw new Error(`Invalid analysis ID: "${id}"`);
  }
  try {
    return getAnalysisDependencyGraphQuery(db, numericId);
  } catch (error) {
    console.error(
      `Failed to fetch analysis dependency graph for id "${id}":`,
      error,
    );
    throw new Error(`Failed to fetch analysis dependency graph for id "${id}"`);
  }
});

export const getAnalysisTreemap = createServerFn({
  method: "GET",
}).handler(async (id: string) => {
  const numericId = parseInt(id);
  if (isNaN(numericId)) {
    throw new Error(`Invalid analysis ID: "${id}"`);
  }
  try {
    return getAnalysisTreemapQuery(db, numericId);
  } catch (error) {
    console.error(`Failed to fetch analysis treemap for id "${id}":`, error);
    throw new Error(`Failed to fetch analysis treemap for id "${id}"`);
  }
});
