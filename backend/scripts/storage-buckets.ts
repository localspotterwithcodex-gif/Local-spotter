/**
 * Creates or updates the Supabase Storage buckets (MASTER-PROMPT Phase 4). Safe to re-run.
 *
 *   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... npx ts-node scripts/storage-buckets.ts
 *
 * shop-media, product-images and review-media are public (unguessable file names); chat-attachments is private
 * (signed URLs only). Size limits and allowed types are enforced by Supabase as well as by the API.
 */
import { BUCKETS } from '../src/media/storage-layout';
import { SupabaseStorageClient } from '../src/media/supabase-storage';

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  const client = new SupabaseStorageClient({ url, serviceKey });
  for (const spec of BUCKETS) {
    const result = await client.ensureBucket(spec);
    console.log(`${spec.id}: ${result} (${spec.public ? 'public' : 'private'}, max ${Math.round(spec.fileSizeLimit / 1048576)} MB, ${spec.allowedMimeTypes.join(', ')})`);
  }
}

main().catch((err: Error) => {
  console.error(`storage-buckets: ${err.message}`);
  process.exit(1);
});
