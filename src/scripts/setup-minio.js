/**
 * Phase 0 Setup Script — creates MinIO buckets and lifecycle rules
 * Run once: node src/scripts/setup-minio.js
 */
const {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketLifecycleConfigurationCommand,
} = require('@aws-sdk/client-s3');

const client = new S3Client({
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER || 'ticketbox_admin',
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'ticketbox_secret_2026',
  },
  forcePathStyle: true,
});

async function bucketExists(name) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: name }));
    return true;
  } catch {
    return false;
  }
}

async function createBucket(name) {
  if (await bucketExists(name)) {
    console.log(`  already exists — skipping: ${name}`);
    return;
  }
  await client.send(new CreateBucketCommand({ Bucket: name }));
  console.log(`  created: ${name}`);
}

async function setLifecycleRule(bucket) {
  await client.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: bucket,
      LifecycleConfiguration: {
        Rules: [
          {
            ID: 'purge-error-tagged-objects-30d',
            Status: 'Enabled',
            Filter: {
              Tag: { Key: 'status', Value: 'error' },
            },
            Expiration: { Days: 30 },
          },
        ],
      },
    }),
  );
  console.log(`  lifecycle rule (30d for status=error) set on: ${bucket}`);
}

async function main() {
  console.log('\nPhase 0 - MinIO Bucket Setup\n');
  console.log('Creating buckets...');
  await createBucket('ticketbox-images');
  await createBucket('ticketbox-csv-imports');
  console.log('\nSetting lifecycle rules...');
  await setLifecycleRule('ticketbox-csv-imports');
  console.log('\nSetup complete!');
  console.log('  MinIO Console: http://localhost:9001');
  console.log('  Login:         ticketbox_admin / ticketbox_secret_2026\n');
}

main().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
