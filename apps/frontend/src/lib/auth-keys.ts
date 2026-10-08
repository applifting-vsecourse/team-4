// Shared auth query keys. Lives in lib/ so config/ and features/ can both
// import it without violating the layer graph (config/ may not import from
// features/).
export const authKeys = {
  all: () => ["auth"] as const,
  session: () => [...authKeys.all(), "session"] as const,
}
