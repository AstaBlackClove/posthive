const MB = 1024 * 1024;
const MAX_CHUNK = 64 * MB;
const SPLIT_CHUNK = 32 * MB;

// TikTok chunked upload: every chunk is 5-64 MB except the last, which absorbs the remainder
// (up to 128 MB), and total_chunk_count is floor(video_size / chunk_size). A video up to 64 MB
// goes up as one chunk. Counting with ceil sent a count TikTok rejects ("The total chunk count
// is invalid") for any video between 64 and 100 MB.
export function planTikTokChunks(videoSize: number): { chunkSize: number; totalChunkCount: number } {
  if (videoSize <= MAX_CHUNK) return { chunkSize: videoSize, totalChunkCount: 1 };

  return { chunkSize: SPLIT_CHUNK, totalChunkCount: Math.floor(videoSize / SPLIT_CHUNK) };
}

// Byte range of chunk i; the last chunk runs to the end of the video.
export function tikTokChunkRange(
  i: number,
  chunkSize: number,
  totalChunkCount: number,
  videoSize: number,
): { start: number; end: number } {
  const start = i * chunkSize;
  const end = i === totalChunkCount - 1 ? videoSize - 1 : start + chunkSize - 1;

  return { start, end };
}
