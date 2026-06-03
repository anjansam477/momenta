export function getInitials(user: { fullName?: string; userName?: string; email?: string } | string): string {
  const source = typeof user === 'string' ? user : (user?.fullName ?? user?.userName ?? user?.email ?? '?');
  const words = source.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function convertBufferToBase64(buffer: { contentType: string; data: number[] }): string {
  const binaryString = buffer.data.map((b: number) => String.fromCharCode(b)).join('');
  return `data:${buffer.contentType};base64,${btoa(binaryString)}`;
}
