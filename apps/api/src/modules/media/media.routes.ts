import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Router } from "express";
import sharp from "sharp";
import { z } from "zod";
import { config } from "../../config.js";
import { query } from "../../db/pool.js";
import { requireAuth, type AuthedRequest } from "../../http/auth-middleware.js";
import { asyncHandler } from "../../http/errors.js";

export const mediaRouter = Router();
mediaRouter.use(requireAuth);

const s3 = new S3Client({
  region: config.S3_REGION,
  endpoint: config.S3_ENDPOINT,
  credentials: config.S3_ACCESS_KEY_ID && config.S3_SECRET_ACCESS_KEY ? {
    accessKeyId: config.S3_ACCESS_KEY_ID,
    secretAccessKey: config.S3_SECRET_ACCESS_KEY
  } : undefined,
  forcePathStyle: Boolean(config.S3_ENDPOINT)
});

function publicUrlForKey(key: string) {
  return `${config.S3_ENDPOINT ?? ""}/${config.S3_BUCKET}/${key}`;
}

async function bodyToBuffer(body: unknown) {
  const stream = body as { transformToByteArray?: () => Promise<Uint8Array> } | null;
  if (stream?.transformToByteArray) {
    return Buffer.from(await stream.transformToByteArray());
  }
  throw new Error("S3 body cannot be converted to a buffer");
}

async function createThumbnail(key: string) {
  const object = await s3.send(new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: key }));
  const original = await bodyToBuffer(object.Body);
  const thumbnail = await sharp(original).resize({ width: 320, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  const thumbnailKey = key.replace(/\.[^.]+$/, "-thumb.jpg");
  await s3.send(new PutObjectCommand({
    Bucket: config.S3_BUCKET,
    Key: thumbnailKey,
    Body: thumbnail,
    ContentType: "image/jpeg"
  }));
  return publicUrlForKey(thumbnailKey);
}

mediaRouter.post("/presign", asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const { contentType, sizeBytes } = z.object({
    contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    sizeBytes: z.number().int().max(10 * 1024 * 1024).optional()
  }).parse(req.body);
  if (sizeBytes && sizeBytes > 10 * 1024 * 1024) {
    res.status(400).json({ error: "File is too large" });
    return;
  }
  const key = `users/${userId}/${Date.now()}.${contentType.split("/")[1]}`;
  const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: config.S3_BUCKET, Key: key, ContentType: contentType }), { expiresIn: 300 });
  const photoUrl = publicUrlForKey(key);
  res.json({ uploadUrl, key, photoUrl, publicUrl: photoUrl });
}));

mediaRouter.post("/photos", asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const body = z.object({
    url: z.string().url(),
    key: z.string().optional(),
    thumbnail_url: z.string().url().optional(),
    order_index: z.number().int().default(0),
    is_primary: z.boolean().default(false)
  }).parse(req.body);
  let thumbnailUrl = body.thumbnail_url;
  if (!thumbnailUrl && body.key) {
    try {
      thumbnailUrl = await createThumbnail(body.key);
    } catch (error) {
      console.error("Thumbnail generation failed", error);
    }
  }
  const result = await query("INSERT INTO photos(user_id,url,thumbnail_url,order_index,is_primary) VALUES($1,$2,$3,$4,$5) RETURNING *", [
    userId, body.url, thumbnailUrl ?? body.url, body.order_index, body.is_primary
  ]);
  res.status(201).json(result.rows[0]);
}));

mediaRouter.delete("/photos/:id", asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const result = await query("DELETE FROM photos WHERE id=$1 AND user_id=$2 RETURNING id", [req.params.id, userId]);
  res.status(result.rowCount ? 200 : 404).json(result.rowCount ? { ok: true } : { error: "Photo not found" });
}));

mediaRouter.patch("/photos/reorder", asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const items = z.array(z.object({ id: z.string().uuid(), order_index: z.number().int().min(0) })).parse(req.body);
  await Promise.all(items.map((item) => query(
    "UPDATE photos SET order_index=$1 WHERE id=$2 AND user_id=$3",
    [item.order_index, item.id, userId]
  )));
  res.json({ ok: true });
}));
