import { readFile } from "fs/promises";
import { join } from "path";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function getContentType(filename) {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf("."));
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

export async function GET(request, { params }) {
  const { filename } = await params;

  // Reject path traversal attempts
  if (
    !filename ||
    filename.includes("/") ||
    filename.includes("\\") ||
    filename.includes("..")
  ) {
    return new Response("Invalid filename", { status: 400 });
  }

  const ext = filename.toLowerCase().substring(filename.lastIndexOf("."));
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return new Response("Unsupported file type", { status: 400 });
  }

  try {
    const filePath = join(process.cwd(), "data", "images", filename);
    const buffer = await readFile(filePath);
    const contentType = getContentType(filename);

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      return new Response("Image not found", { status: 404 });
    }
    return new Response("Error reading image", { status: 500 });
  }
}
