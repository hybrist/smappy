import { FileSummary } from "./mcp-app";

export default {
  title: "FileSummary",
  component: FileSummary,
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: "select",
      options: ["source", "package"],
    },
  },
};

export const AppFile = {
  args: {
    type: "source",
    name: "button.tsx",
    path: "src/components/ui/button.tsx",
    size: "4.2 KB",
    gzip: "1.1 KB",
    issuers: [
      "src/pages/home.tsx",
      "src/pages/dashboard.tsx",
      "src/components/layout/navbar.tsx",
    ],
    codeSnippet: "/* Hello World! */\n",
  },
};

export const PackageFile = {
  args: {
    type: "package",
    name: "moment.js",
    path: "node_modules/moment/moment.js",
    size: "231 KB",
    gzip: "68 KB",
    issuers: ["src/utils/date-formatter.ts", "src/components/calendar.tsx"],
    codeSnippet: "/* Hello World! */\n",
  },
};
