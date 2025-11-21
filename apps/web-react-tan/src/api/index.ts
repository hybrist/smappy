import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
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

const db = createDatabase({
  dbPath: process.env.DATABASE_URL || ":memory:",
}).db;

// Validation schemas
const ProjectNameSchema = v.object({
  projectName: v.pipe(v.string(), v.minLength(1, "Project name is required")),
});

const AnalysisIdSchema = v.object({
  id: v.pipe(
    v.string(),
    v.regex(/^\d+$/, "ID must be a numeric string"),
    v.transform((val) => parseInt(val, 10)),
  ),
});

const AnalysisModulesSchema = v.object({
  id: v.pipe(
    v.string(),
    v.regex(/^\d+$/, "ID must be a numeric string"),
    v.transform((val) => parseInt(val, 10)),
  ),
  filters: v.optional(v.any()),
});

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
})
  .inputValidator(ProjectNameSchema)
  .handler(async ({ data }) => {
    try {
      return listAnalysisRuns(db, { projectName: data.projectName });
    } catch (error) {
      console.error(
        `Failed to fetch analyses for project "${data.projectName}":`,
        error,
      );
      throw new Error(
        `Failed to fetch analyses for project "${data.projectName}"`,
      );
    }
  });

export const getAnalysisDetails = createServerFn({
  method: "GET",
})
  .inputValidator(AnalysisIdSchema)
  .handler(async ({ data }) => {
    try {
      return getAnalysisDetailsQuery(db, data.id);
    } catch (error) {
      console.error(
        `Failed to fetch analysis details for id "${data.id}":`,
        error,
      );
      throw new Error(`Failed to fetch analysis details for id "${data.id}"`);
    }
  });

export const getAnalysisModules = createServerFn({
  method: "GET",
})
  .inputValidator(AnalysisModulesSchema)
  .handler(async ({ data }) => {
    try {
      return getAnalysisModulesQuery(db, data.id, data.filters);
    } catch (error) {
      console.error(
        `Failed to fetch analysis modules for id "${data.id}":`,
        error,
      );
      throw new Error(`Failed to fetch analysis modules for id "${data.id}"`);
    }
  });

export const getAnalysisBundles = createServerFn({
  method: "GET",
})
  .inputValidator(AnalysisIdSchema)
  .handler(async ({ data }) => {
    try {
      return getAnalysisBundlesQuery(db, data.id);
    } catch (error) {
      console.error(
        `Failed to fetch analysis bundles for id "${data.id}":`,
        error,
      );
      throw new Error(`Failed to fetch analysis bundles for id "${data.id}"`);
    }
  });

export const getAnalysisDependencyGraph = createServerFn({
  method: "GET",
})
  .inputValidator(AnalysisIdSchema)
  .handler(async ({ data }) => {
    try {
      return getAnalysisDependencyGraphQuery(db, data.id);
    } catch (error) {
      console.error(
        `Failed to fetch analysis dependency graph for id "${data.id}":`,
        error,
      );
      throw new Error(
        `Failed to fetch analysis dependency graph for id "${data.id}"`,
      );
    }
  });

export const getAnalysisTreemap = createServerFn({
  method: "GET",
})
  .inputValidator(AnalysisIdSchema)
  .handler(async ({ data }) => {
    try {
      return getAnalysisTreemapQuery(db, data.id);
    } catch (error) {
      console.error(
        `Failed to fetch analysis treemap for id "${data.id}":`,
        error,
      );
      throw new Error(`Failed to fetch analysis treemap for id "${data.id}"`);
    }
  });
