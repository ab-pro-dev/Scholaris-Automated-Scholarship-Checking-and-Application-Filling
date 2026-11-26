import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env.js';

export class S3Service {
  private client: S3Client;
  private bucket: string;
  private bucketEnsured = false;

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

  async ensureBucketExists(): Promise<void> {
    if (this.bucketEnsured) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.bucketEnsured = true;
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.bucketEnsured = true;
      } catch (createErr) {
        console.warn(`Unable to auto-create S3 bucket "${this.bucket}":`, createErr);
      }
    }
  }

  async getPresignedUploadUrl(
    fileKey: string,
    mimeType: string,
    expiresIn = 900
  ): Promise<string> {
    await this.ensureBucketExists();
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

  async getObjectBuffer(fileKey: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });
    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`S3 object body is empty for key: ${fileKey}`);
    }
    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  }
}
