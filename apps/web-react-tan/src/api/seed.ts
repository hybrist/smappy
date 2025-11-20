import { saveAnalysisRun } from "@smappy/store/queries";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "@smappy/store/schema";

export function seedDatabase(db: BetterSQLite3Database<typeof schema>) {
  saveAnalysisRun(db, {
    projectName: "smappy",
    bundler: "vite",
  });
  saveAnalysisRun(db, {
    projectName: "smappy",
    bundler: "webpack",
  });
  saveAnalysisRun(db, {
    projectName: "acme-corp",
    bundler: "vite",
  });
}
