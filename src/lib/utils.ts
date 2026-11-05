export type ClassNameValue = string | false | null | undefined;

export function cn(...classNames: readonly ClassNameValue[]): string {
  return classNames.filter(Boolean).join(" ");
}
