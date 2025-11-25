# S3 Storage Migration Implementation

## ✅ ALL COMPLETED!

### Infrastructure
- ✅ Added `@effect-aws/client-s3` and AWS SDK dependencies to `packages/database`
- ✅ Created `packages/database/src/storage.ts` with Storage service interface
  - S3StorageLayer for production
  - ConvexStorageLayer for dev/test (placeholder)
  - StorageLayer that switches based on NODE_ENV
  - Uploads to S3 with path pattern: `{attachmentId}/{filename}`
- ✅ No schema changes needed! URLs are constructed dynamically
- ✅ Created `apps/discord-bot/src/core/storage-service.ts` layer export
- ✅ Created `apps/discord-bot/src/utils/attachment-upload.ts` helper functions
- ✅ Added S3 config to .env (commented out)

### Code Migration
- ✅ Updated `apps/discord-bot/index.ts` to include BotStorageLayer
- ✅ Updated `apps/discord-bot/src/handlers/indexing.ts` to use new upload helper
- ✅ Updated `apps/discord-bot/src/handlers/message-parity.ts` to use new upload helper (2 places)
- ✅ Updated `apps/discord-bot/src/handlers/server-parity.ts` to use Storage service directly
- ✅ Updated `packages/database/convex/shared/shared.ts` enrichMessageForDisplay to prefer s3Url
- ✅ Updated `apps/discord-bot/src/utils/layers.ts` to include ConvexStorageLayer in tests
- ✅ Ran codegen to update function types
- ✅ All typechecks pass
- ✅ All tests pass

## Legacy Code (Can be removed later)

### 1. Update Discord Bot Index to Include StorageLayer
File: `apps/discord-bot/index.ts`
- Import `BotStorageLayer` from `./src/core/storage-service`
- Add to `BaseLayer` with `Layer.mergeAll`

### 2. Update Indexing Handler  
File: `apps/discord-bot/src/handlers/indexing.ts`
- Import `uploadAttachmentsInBatches` from `../utils/attachment-upload`
- Replace the uploadManyAttachmentsFromUrls call (around line 240) with:
```typescript
yield* uploadAttachmentsInBatches(allAttachments, aoMessages);
```
- Remove the old attachment upload logic (the for loop that updates storageId)

### 3. Update Message Parity Handler
File: `apps/discord-bot/src/handlers/message-parity.ts`
- Same as indexing handler - find two places where `uploadManyAttachmentsFromUrls` is called
- Replace with `uploadAttachmentsInBatches`

### 4. Update Server Parity Handler  
File: `apps/discord-bot/src/handlers/server-parity.ts`
- Find the `uploadAttachmentFromUrl` call (server icon upload)
- Replace with direct Storage service usage:
```typescript
const storage = yield* Storage;
yield* storage.uploadFileFromUrl({
  id: server.icon,
  filename: "icon.png",
  contentType: "image/png",
  url: `https://cdn.discordapp.com/icons/${guild.id}/${server.icon}.png?size=48`,
});
```

### 5. Update enrichMessageForDisplay
File: `packages/database/convex/shared/shared.ts` (around line 917-929)
- Update to prefer `s3Url` over constructing URL from `storageId`:
```typescript
const attachmentsWithUrl: Attachment[] = Arr.filter(
  Arr.map(attachments, (attachment: DatabaseAttachment) => {
    // Prefer s3Url (production) over storageId (dev/test)
    if (attachment.s3Url) {
      return {
        ...attachment,
        url: attachment.s3Url,
      };
    }
    if (attachment.storageId && convexSiteUrl) {
      return {
        ...attachment,
        url: `${convexSiteUrl}/getAttachment?storageId=${attachment.storageId}`,
      };
    }
    return null;
  }),
  Predicate.isNotNull,
);
```

### 6. Remove Old Convex Upload Logic (Optional)
Files to potentially remove/deprecate:
- `packages/database/convex/private/attachments.ts` - The uploadAttachmentFromUrl and uploadManyAttachmentsFromUrls actions
- `packages/database/convex/shared/shared.ts` - The uploadAttachmentFromUrlLogic function

Note: Keep these for now during migration, can be removed after confirming everything works.

### 7. Implement Convex Storage (Future)
File: `packages/database/src/storage.ts`
- Update `ConvexStorageServiceLive` to actually use Convex storage API
- Will need access to Convex action context somehow

## Environment Variables

Production requires these environment variables:
```bash
BUCKET_NAME=your-s3-bucket-name
IAM_USER_KEY=your-aws-access-key-id
IAM_USER_SECRET=your-aws-secret-access-key
NODE_ENV=production
CDN_DOMAIN=cdn.answeroverflow.com  # Optional, defaults to cdn.answeroverflow.com
```

Development/Test uses Convex storage (placeholder - returns null currently).

## URL Construction

**Production**: Files are uploaded to S3 at `{bucket}/{attachmentId}/{filename}` and served via `https://{CDN_DOMAIN}/{attachmentId}/{filename}`

**Development**: Files are uploaded to Convex storage (via existing `uploadAttachmentFromUrl` action) and served via `{CONVEX_SITE_URL}/getAttachment?storageId={storageId}`

The `enrichMessageForDisplay` function:
1. Checks if attachment has `storageId` → uses Convex URL (dev/backwards compat)
2. Otherwise → constructs CDN URL from attachment ID + filename (production)

## Implementation Details

**Upload Flow**:
- Production: `uploadAttachmentsWithStorage` → `Storage.uploadFileFromUrl` → S3
- Development: `uploadAttachmentsWithStorage` → `database.private.attachments.uploadAttachmentFromUrl` → Convex storage
- The NODE_ENV check happens in `attachment-upload.ts` to route to the correct implementation

**Why Two Paths?**:
- Convex storage requires ActionCtx (only available in Convex actions)
- S3 can be called directly from Discord bot
- Clean separation allows each to use its native APIs optimally

## Testing

1. Test in development (Convex storage - will log messages)
2. Test in production with S3 credentials
3. Verify attachments display correctly with both `s3Url` and `storageId` paths
4. Check that old messages with only `storageId` still work
5. Check that new messages in production get `s3Url`
