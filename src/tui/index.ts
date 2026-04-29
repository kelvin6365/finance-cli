import { render } from "ink";
import { createElement } from "react";

import type { Database } from "../core/types.ts";
import { App } from "./App.tsx";

export const renderApp = async (db: Database): Promise<void> => {
  const instance = render(createElement(App, { db }));
  await instance.waitUntilExit();
};
