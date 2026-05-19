export function thumbnailUrl(src: string | null, width = 160): string {
  if (!src) {
    return "";
  }

  const params = new URLSearchParams({
    src,
    w: String(width)
  });

  return `/api/images/thumb?${params.toString()}`;
}
