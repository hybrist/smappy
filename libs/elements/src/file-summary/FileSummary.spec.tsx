import { describe, it, expect } from "vitest";
import { render } from "@testing-library/preact";

import { FileSummary, type FileSummaryProps } from "./mcp-app";
import { AppFile } from "./FileSummary.stories";

const sourceProps: FileSummaryProps = AppFile.args;

describe("FileSummary", () => {
  it("renders correctly", () => {
    const { container } = render(<FileSummary {...sourceProps} />);
    expect(container).toMatchSnapshot();
  });
});
