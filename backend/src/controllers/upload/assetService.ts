import { prisma } from "@/lib/prisma.js";

type AssetType = "IMAGE" | "PDF" | "VIDEO" | "FILE";

const mimeToAssetType = (mime: string): AssetType => {
  if (mime.startsWith("image/")) return "IMAGE";
  if (mime === "application/pdf") return "PDF";
  if (mime.startsWith("video/")) return "VIDEO";
  return "FILE";
};

export async function createAsset(data: {
  boardId: string;
  uploadedBy: string;
  url: string;
  mimetype: string;
}) {
  return await prisma.asset.create({
    data: {
      boardId: data.boardId,
      uploadedBy: data.uploadedBy,
      url: data.url,
      type: mimeToAssetType(data.mimetype),
    },
  });
}

export async function getAsset(id: string) {
  return await prisma.asset.findUnique({
    where: { id },
  });
}

export async function getAssetsForBoard(boardId: string) {
  return await prisma.asset.findMany({
    where: { boardId },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteAsset(id: string) {
  return await prisma.asset.delete({
    where: { id },
  });
}
