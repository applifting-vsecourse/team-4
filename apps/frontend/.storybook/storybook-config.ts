import type { PluginOption } from "vite"

type NamedPlugin = { name: string }

// Plugins of vite.config.ts that must not run for previews: the TanStack
// router plugins (the generator would rewrite src/routeTree.gen.ts next to the
// running dev server) and the type/lint checker.
const APP_ONLY_PLUGIN_PREFIXES = ["tanstack", "vite-plugin-checker"]

export function withoutAppOnlyPlugins(plugins: PluginOption[]): NamedPlugin[] {
  return (plugins as unknown[])
    .flat(Infinity)
    .filter(
      (plugin): plugin is NamedPlugin =>
        typeof plugin === "object" &&
        plugin !== null &&
        "name" in plugin &&
        typeof plugin.name === "string" &&
        !APP_ONLY_PLUGIN_PREFIXES.some((prefix) => (plugin.name as string).startsWith(prefix)),
    )
}

/** A request to the backend API, which in previews must come from an MSW handler. */
export function isApiRequest(url: string, apiUrl: string): boolean {
  const base = apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`
  return url === apiUrl || url.startsWith(base)
}
