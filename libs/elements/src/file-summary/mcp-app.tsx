import z from "zod";
import { FileCode, Box, ArrowRight, Layers } from "lucide-react";

function defineAppTool() {}

function definePreactAppTool() {
  return defineAppTool();
}

const FileSummarySchema = z.object({
  type: z.string(),
  name: z.string(),
  path: z.string(),
  size: z.string(),
  gzip: z.string(),
  issuers: z.array(z.string()),
  codeSnippet: z.string(),
});

export type FileSummaryProps = z.output<typeof FileSummarySchema>;

export function FileSummary(props: FileSummaryProps) {
  return (
    <div className="w-[400px] sm:w-[540px] flex flex-col h-full">
      <div className="pb-6 border-b">
        <div className="flex items-center gap-2 font-mono text-lg text-primary">
          {props.type === "package" ? (
            <Box className="w-5 h-5" />
          ) : (
            <FileCode className="w-5 h-5" />
          )}
          {props.name}
        </div>
        <div>
          Full path:{" "}
          <code className="bg-muted px-1 py-0.5 rounded text-xs break-all">
            {props.path}
          </code>
        </div>
      </div>

      <div className="flex-1 -mr-6 pr-6">
        <div className="py-6 space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-sm text-muted-foreground mb-1">
                Parsed Size
              </div>
              <div className="text-2xl font-bold">{props.size}</div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-sm text-muted-foreground mb-1">
                Gzip Size
              </div>
              <div className="text-2xl font-bold text-primary">
                {props.gzip}
              </div>
            </div>
          </div>

          {/* Issuers / Why is it here? */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Imported By (Issuers)
            </h3>
            <div className="rounded-lg border bg-muted/30 divide-y">
              {props.issuers.map((issuer, i) => (
                <div
                  key={i}
                  className="p-3 text-sm font-mono text-muted-foreground flex items-center gap-2"
                >
                  <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                  {issuer}
                </div>
              ))}
            </div>
          </div>

          {/* Code Preview */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              Source Preview
            </h3>
            <div className="rounded-lg border bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#333] bg-[#252526]">
                <span>{props.name}</span>
                <span className="text-[10px] text-[#858585]">Read-only</span>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre>{props.codeSnippet}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default definePreactAppTool();
