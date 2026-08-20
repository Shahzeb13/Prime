export function isDev(): boolean {
  return Boolean(import.meta.env.DEV)
}
