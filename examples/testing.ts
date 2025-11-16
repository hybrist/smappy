import { fileURLToPath } from "node:url";

export const EXAMPLES_PATH = new URL("./", import.meta.url);

export class Example {
  readonly #name: string;

  constructor(name: string) {
    this.#name = name;
  }

  getPath() {
    return fileURLToPath(new URL(this.#name, EXAMPLES_PATH));
  }

  static fromName(name: string) {
    return new Example(name);
  }
}
