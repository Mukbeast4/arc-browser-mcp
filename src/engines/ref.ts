export function isValidRef(ref: string): boolean {
  return /^\d+$/.test(ref);
}

export function assertRef(ref: string): void {
  if (!isValidRef(ref)) throw new Error(`invalid ref "${ref}"; use a ref from arc_snapshot`);
}
