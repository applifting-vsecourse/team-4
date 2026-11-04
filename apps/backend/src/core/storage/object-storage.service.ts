import { Config } from '@/shared/config/config.service';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';

export type StoredObject = { body: Uint8Array; contentType: string };

/**
 * Binary files in an S3-compatible bucket (MinIO locally). The bucket is
 * created on the first write, so a fresh environment needs no setup and the
 * app starts without the storage being reachable.
 */
@Injectable()
export class ObjectStorage {
  private readonly logger = new Logger(ObjectStorage.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private bucketReady: Promise<void> | null = null;

  constructor(config: Config) {
    this.bucket = config.s3Bucket;
    this.client = new S3Client({
      endpoint: config.s3Endpoint,
      region: config.s3Region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.s3AccessKeyId,
        secretAccessKey: config.s3SecretAccessKey,
      },
    });
  }

  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    await this.ensureBucket();
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string): Promise<StoredObject> {
    const object = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!object.Body) throw new Error(`Object ${key} has no body`);
    return {
      body: await object.Body.transformToByteArray(),
      contentType: object.ContentType ?? 'application/octet-stream',
    };
  }

  /** Best effort: a leftover object costs storage, never correctness. */
  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (error) {
      this.logger.warn(`Could not delete object ${key}: ${String(error)}`);
    }
  }

  private ensureBucket(): Promise<void> {
    this.bucketReady ??= this.createBucketIfMissing().catch((error) => {
      this.bucketReady = null;
      throw error;
    });
    return this.bucketReady;
  }

  private async createBucketIfMissing(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }
}
