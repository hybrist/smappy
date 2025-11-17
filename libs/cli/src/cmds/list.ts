/**
 * List command implementation
 * Lists analyzed projects or analysis runs for a specific project
 */

import { createStore } from "@smappy/store";

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format date string to human-readable format
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return dateString;
  }
}

/**
 * Format project list as a text table
 */
function formatProjectsTable(
  projects: Array<{
    projectName: string;
    latestRunDate: string | null;
    totalRuns: number;
  }>,
): string {
  if (projects.length === 0) {
    return "No projects found.";
  }

  // Calculate column widths
  const nameWidth = Math.max(
    "Project Name".length,
    ...projects.map((p) => p.projectName.length),
  );
  const dateWidth = Math.max(
    "Latest Run".length,
    ...projects.map((p) => formatDate(p.latestRunDate).length),
  );
  const runsWidth = Math.max(
    "Runs".length,
    ...projects.map((p) => p.totalRuns.toString().length),
  );

  const header = `| ${"Project Name".padEnd(nameWidth)} | ${"Latest Run".padEnd(dateWidth)} | ${"Runs".padStart(runsWidth)} |`;
  const separator = `|${"-".repeat(nameWidth + 2)}|${"-".repeat(dateWidth + 2)}|${"-".repeat(runsWidth + 2)}|`;

  const rows = projects.map(
    (p) =>
      `| ${p.projectName.padEnd(nameWidth)} | ${formatDate(p.latestRunDate).padEnd(dateWidth)} | ${p.totalRuns.toString().padStart(runsWidth)} |`,
  );

  return [header, separator, ...rows].join("\n");
}

/**
 * Format analysis runs list as a text table
 */
function formatRunsTable(
  runs: Array<{ id: number; createdAt: string; totalSize: number }>,
): string {
  if (runs.length === 0) {
    return "No analysis runs found.";
  }

  // Calculate column widths
  const idWidth = Math.max(
    "ID".length,
    ...runs.map((r) => r.id.toString().length),
  );
  const dateWidth = Math.max(
    "Created At".length,
    ...runs.map((r) => formatDate(r.createdAt).length),
  );
  const sizeWidth = Math.max(
    "Total Size".length,
    ...runs.map((r) => formatBytes(r.totalSize).length),
  );

  const header = `| ${"ID".padStart(idWidth)} | ${"Created At".padEnd(dateWidth)} | ${"Total Size".padStart(sizeWidth)} |`;
  const separator = `|${"-".repeat(idWidth + 2)}|${"-".repeat(dateWidth + 2)}|${"-".repeat(sizeWidth + 2)}|`;

  const rows = runs.map(
    (r) =>
      `| ${r.id.toString().padStart(idWidth)} | ${formatDate(r.createdAt).padEnd(dateWidth)} | ${formatBytes(r.totalSize).padStart(sizeWidth)} |`,
  );

  return [header, separator, ...rows].join("\n");
}

/**
 * Main list command handler
 */
export async function listCommand(projectName?: string): Promise<number> {
  const store = createStore();

  try {
    if (projectName) {
      // List analysis runs for a specific project
      const runs = store.listAnalysisRuns({ projectName });

      if (runs.length === 0) {
        console.log(`No analysis runs found for project: ${projectName}`);
        return 0;
      }

      console.log(`Analysis runs for project: ${projectName}\n`);
      console.log(
        formatRunsTable(
          runs.map((r) => ({
            id: r.id,
            createdAt: r.createdAt,
            totalSize: r.totalSize,
          })),
        ),
      );
    } else {
      // List all projects
      const projects = store.listProjects();

      if (projects.length === 0) {
        console.log("No analyzed projects found.");
        return 0;
      }

      console.log("Analyzed projects:\n");
      console.log(formatProjectsTable(projects));
    }

    return 0;
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error),
    );
    return 1;
  } finally {
    store.close();
  }
}
