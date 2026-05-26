const NON_SLUG = /[^a-z0-9]+/g;
const TRIM_DASHES = /^-+|-+$/g;

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .toLowerCase()
    .replace(NON_SLUG, '-')
    .replace(TRIM_DASHES, '');
}

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}
