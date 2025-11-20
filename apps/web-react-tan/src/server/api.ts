/**
 * API Server for Server Functions
 * Exposes server functions as HTTP endpoints
 */

import express from "express";
import type { Request, Response } from "express";
import dotenv from "dotenv";
import * as serverFunctions from "./functions";

// Load environment variables
dotenv.config();

const app: express.Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// CORS middleware for development
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  next();
});

// Error handling wrapper
const asyncHandler = (
  fn: (req: Request, res: Response) => Promise<void>,
) => {
  return (req: Request, res: Response) => {
    Promise.resolve(fn(req, res)).catch((error) => {
      console.error("API Error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    });
  };
};

// ============================================================================
// API Routes
// ============================================================================

/**
 * GET /api/projects
 * Get all projects with summary information
 */
app.get(
  "/api/projects",
  asyncHandler(async (req, res) => {
    const projects = await serverFunctions.getProjects();
    res.json(projects);
  }),
);

/**
 * GET /api/projects/:projectName/analyses
 * Get analysis history for a specific project
 */
app.get(
  "/api/projects/:projectName/analyses",
  asyncHandler(async (req, res) => {
    const { projectName } = req.params;
    const analyses = await serverFunctions.getProjectAnalyses(projectName);
    res.json(analyses);
  }),
);

/**
 * GET /api/analyses/:id
 * Get detailed information about a specific analysis
 */
app.get(
  "/api/analyses/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const analysis = await serverFunctions.getAnalysisDetails(id);

    if (!analysis) {
      res.status(404).json({ error: "Analysis not found" });
      return;
    }

    res.json(analysis);
  }),
);

/**
 * GET /api/analyses/:id/modules
 * Get modules for an analysis with optional filtering
 */
app.get(
  "/api/analyses/:id/modules",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      fileType,
      isThirdParty,
      packageName,
      search,
      sortBy,
      sortOrder,
      page,
      pageSize,
    } = req.query;

    const filters: serverFunctions.ModuleFilters = {
      fileType: fileType as string | undefined,
      isThirdParty:
        isThirdParty !== undefined
          ? isThirdParty === "true"
          : undefined,
      packageName: packageName as string | undefined,
      search: search as string | undefined,
      sortBy: sortBy as
        | "filePath"
        | "originalSize"
        | "bundledSize"
        | undefined,
      sortOrder: sortOrder as "asc" | "desc" | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
    };

    const modules = await serverFunctions.getAnalysisModules(id, filters);
    res.json(modules);
  }),
);

/**
 * GET /api/analyses/:id/bundles
 * Get bundles for an analysis
 */
app.get(
  "/api/analyses/:id/bundles",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const bundles = await serverFunctions.getAnalysisBundles(id);
    res.json(bundles);
  }),
);

/**
 * GET /api/analyses/:id/dependency-graph
 * Get dependency graph for an analysis
 */
app.get(
  "/api/analyses/:id/dependency-graph",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const graph = await serverFunctions.getAnalysisDependencyGraph(id);

    // Convert Map to array for JSON serialization
    const graphArray = Array.from(graph.values());
    res.json(graphArray);
  }),
);

/**
 * GET /api/analyses/:id/treemap
 * Get treemap data for an analysis
 */
app.get(
  "/api/analyses/:id/treemap",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const treemap = await serverFunctions.getAnalysisTreemap(id);
    res.json(treemap);
  }),
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Start server
app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
  console.log(`Database: ${process.env.DATABASE_URL || ":memory:"}`);
});

export default app;
