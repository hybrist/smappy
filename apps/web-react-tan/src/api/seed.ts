import { saveAnalysisRun } from "@smappy/store/queries";

export function seedDatabase(db: any) {
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
