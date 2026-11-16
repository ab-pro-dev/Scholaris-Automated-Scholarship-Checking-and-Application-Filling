import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env.js';

export class S3Service {
  private client: S3Client;
  private bucket: string;

  constructor(customClient?: S3Client, customBucket?: string) {
    this.bucket = customBucket || env.S3_BUCKET;
    this.client =
      customClient ||
      new S3Client({
        region: env.S3_REGION,
        endpoint: env.S3_ENDPOINT,
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY,
          secretAccessKey: env.S3_SECRET_KEY,
        },
        forcePathStyle: env.S3_FORCE_PATH_STYLE,
      });
  }

  async getPresignedUploadUrl(
    fileKey: string,
    mimeType: string,
    expiresIn = 900
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: mimeType,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async getPresignedDownloadUrl(
    fileKey: string,
    expiresIn = 300,
    filename?: string
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ResponseContentDisposition: filename
        ? `attachment; filename="${encodeURIComponent(filename)}"`
        : undefined,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async deleteObject(fileKey: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });
      await this.client.send(command);
    } catch (err) {
      // Log error but do not fail hard if object was already removed
      console.error(`Failed to delete S3 object: ${fileKey}`, err);
    }
  }

  async checkObjectExists(fileKey: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }
}
