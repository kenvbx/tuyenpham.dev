import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button } from "./Button.js";

describe("Button", () => {
  it("renders a primary button by default", () => {
    const markup = renderToStaticMarkup(<Button>Continue</Button>);

    expect(markup).toContain("cms-button");
    expect(markup).toContain("cms-button--primary");
    expect(markup).toContain("Continue");
  });
});
