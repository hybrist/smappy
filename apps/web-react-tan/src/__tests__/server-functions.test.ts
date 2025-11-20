/**
 * Server Functions Tests
 * Tests for type-safe server functions
 *
 * Note: Tests run with an empty in-memory database, so they verify
 * structure and error handling rather than actual data.
 */

import { describe, it, expect } from "vitest";
import * as serverFunctions from "../server/functions";

describe("Server Functions", () => {
  describe("getProjects", () => {
    it("should return an array of projects", async () => {
      const projects = await serverFunctions.getProjects();
      expect(Array.isArray(projects)).toBe(true);
    });
  });

  describe("getAnalysisDetails", () => {
    it("should return null for non-existent analysis", async () => {
      const analysis = await serverFunctions.getAnalysisDetails("99999");
      expect(analysis).toBeNull();
    });

    it("should return null for invalid ID", async () => {
      const analysis = await serverFunctions.getAnalysisDetails("invalid");
      expect(analysis).toBeNull();
    });
  });

  describe("getAnalysisModules", () => {
    it("should return paginated result structure", async () => {
      const result = await serverFunctions.getAnalysisModules("99999");

      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("page");
      expect(result).toHaveProperty("pageSize");
      expect(result).toHaveProperty("totalPages");

      expect(Array.isArray(result.items)).toBe(true);
      expect(typeof result.total).toBe("number");
      expect(typeof result.page).toBe("number");
      expect(typeof result.pageSize).toBe("number");
      expect(typeof result.totalPages).toBe("number");
    });

    it("should respect pagination parameters", async () => {
      const result = await serverFunctions.getAnalysisModules("1", {
        page: 2,
        pageSize: 10,
      });

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
    });

    it("should handle invalid analysis ID", async () => {
      const result = await serverFunctions.getAnalysisModules("invalid");

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("getAnalysisBundles", () => {
    it("should return array of bundles", async () => {
      const bundles = await serverFunctions.getAnalysisBundles("99999");
      expect(Array.isArray(bundles)).toBe(true);
    });

    it("should return empty array for invalid ID", async () => {
      const bundles = await serverFunctions.getAnalysisBundles("invalid");
      expect(bundles).toEqual([]);
    });
  });

  describe("getAnalysisDependencyGraph", () => {
    it("should return a Map", async () => {
      const graph = await serverFunctions.getAnalysisDependencyGraph("99999");
      expect(graph instanceof Map).toBe(true);
    });

    it("should return empty Map for invalid ID", async () => {
      const graph = await serverFunctions.getAnalysisDependencyGraph("invalid");
      expect(graph.size).toBe(0);
    });
  });

  describe("getAnalysisTreemap", () => {
    it("should return treemap structure", async () => {
      const treemap = await serverFunctions.getAnalysisTreemap("99999");

      expect(treemap).toHaveProperty("name");
      expect(treemap).toHaveProperty("children");
      expect(treemap.name).toBe("root");
      expect(Array.isArray(treemap.children)).toBe(true);
    });

    it("should handle invalid ID", async () => {
      const treemap = await serverFunctions.getAnalysisTreemap("invalid");

      expect(treemap.name).toBe("root");
      expect(treemap.children).toEqual([]);
    });
  });
});

describe("Type Safety", () => {
  it("should have correct TypeScript types", () => {
    // This test mainly validates at compile time
    const filters: serverFunctions.ModuleFilters = {
      fileType: "javascript",
      isThirdParty: true,
      sortBy: "bundledSize",
      sortOrder: "desc",
      page: 1,
      pageSize: 20,
    };

    expect(filters).toBeDefined();
    expect(filters.fileType).toBe("javascript");
  });

  it("should export all required types", () => {
    // Verify types are exported
    const moduleFilters: serverFunctions.ModuleFilters = {};
    const paginatedResult: serverFunctions.PaginatedResult<any> = {
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    };

    expect(moduleFilters).toBeDefined();
    expect(paginatedResult).toBeDefined();
  });
});
