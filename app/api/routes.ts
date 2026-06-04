import path from "node:path";
import { readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { Router } from "express";
import { createLogger } from "~/lib/logger";

type RouteModule = {
  default?: ReturnType<typeof Router>;
};

const logger = createLogger("ApiRoutes");
const routeFilePattern = /\.routes\.(ts|tsx|js|mjs|cjs)$/;

const router = Router();

async function discoverRouteFiles(): Promise<string[]> {
  const modulesPath = path.join(process.cwd(), "app", "modules");
  const moduleEntries = await readdir(modulesPath, { withFileTypes: true }).catch((error) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  });

  const routeFilesSet = new Set<string>();

  for (const entry of moduleEntries) {
    if (!entry.isDirectory()) continue;

    const modulePath = path.join(modulesPath, entry.name);
    const scanPaths = [modulePath, path.join(modulePath, "src", "routes")];

    for (const scanPath of scanPaths) {
      const files = await readdir(scanPath, { withFileTypes: true }).catch(() => []);
      for (const file of files) {
        if (file.isFile() && routeFilePattern.test(file.name)) {
          routeFilesSet.add(path.join(scanPath, file.name));
        }
      }
    }
  }

  // Also scan app/api/<feature>/ for in-tree (non-module) feature routes.
  const apiPath = path.join(process.cwd(), "app", "api");
  const apiEntries = await readdir(apiPath, { withFileTypes: true }).catch(() => []);
  for (const entry of apiEntries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === "models" || entry.name === "seeds") continue;
    const featurePath = path.join(apiPath, entry.name);
    const files = await readdir(featurePath, { withFileTypes: true }).catch(() => []);
    for (const file of files) {
      if (file.isFile() && routeFilePattern.test(file.name)) {
        routeFilesSet.add(path.join(featurePath, file.name));
      }
    }
  }

  return [...routeFilesSet].sort();
}

async function registerModuleRoutes(): Promise<void> {
  const routeFiles = await discoverRouteFiles();

  for (const routeFile of routeFiles) {
    const routeModule = await import(pathToFileURL(routeFile).href) as RouteModule;

    if (!routeModule.default) {
      logger.warn(`Skipping ${path.relative(process.cwd(), routeFile)} because it has no default router export`);
      continue;
    }

    logger.info(`Registering routes from ${path.relative(process.cwd(), routeFile)}`);
    router.use(routeModule.default);
  }
}

await registerModuleRoutes();

export default router;
