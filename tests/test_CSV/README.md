# Running the CSV Service API Tests

## Prerequisites

### 1. Install the REST Client extension in VS Code
Search for **REST Client** by *Humao* in the VS Code Extensions panel and install it.  
This is the same extension used for `tests/test_event/event-service.http`.

### 2. Start the server
```bash
npm run start:dev
```
The server listens on **`http://localhost:3333`** by default.

### 3. Confirm test CSV files are in place
The following files must exist **before** running tests:

| File | Purpose |
|------|---------|
| `uploads/VIP_CSV/inbox/vip_guests.csv` | Happy path — 2 valid rows |
| `uploads/VIP_CSV/inbox/bad_rows.csv` | Bad row test — 1 missing email |

Both files are already created. Verify with:
```
uploads/
└── VIP_CSV/
    └── inbox/
        ├── vip_guests.csv    ✅
        └── bad_rows.csv      ✅
```

### 4. Confirm seed data
On **first** server start, seats A-1 and A-2 are automatically seeded with  
`sponsorId = 'sponsor-test'`. If the DB already has seats (from a previous run),  
update them manually:
```sql
UPDATE seat_inventory
SET "sponsorId" = 'sponsor-test'
WHERE row = 'A' AND number IN ('1', '2')
  AND "showId" = '11111111-1111-1111-1111-111111111111';
```

---

## Running the Tests

Open `csv_service.http` in VS Code. A **Send Request** link appears above each `###` block.

### Step-by-step order

| Step | Request | Action |
|------|---------|--------|
| **1** | `### 1. Register` | Run once. Skip if `admin@ticketbox.dev` already exists. |
| **2** | `### 2. Login` | Run and **copy** `accessToken` from the response. |
| — | Update `@token` | Paste the token into line 14: `@token = <paste here>` |
| **3** | `### 3. Happy Path` | Send. Expect **202**. Copy `job_id` from response. |
| — | Update job ID | Paste `job_id` into `### 4` URL: replace `PASTE_JOB_ID_HERE` |
| **4** | `### 4. Poll Status` | Send repeatedly until `status = "COMPLETED"` |
| **5** | `### 5. Idempotency` | Send same request again. Expect **409 Conflict** |
| **6** | `### 6. Wrong Sponsor` | Expect **202**, then poll → `errorCount = 2` |
| **7** | `### 7. List Jobs` | Returns all jobs for the show, newest first |
| **8** | `### 8. Bad Row` | Expect **202**, then poll → `successCount=1, errorCount=1` |

---

## Expected Results per Test

### Test 3 — Happy Path
```json
{
  "message": "Import task queued successfully",
  "job_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

### Test 4 — Poll Status (final)
```json
{
  "status": "COMPLETED",
  "totalRows": 2,
  "successCount": 2,
  "errorCount": 0,
  "errorDetails": []
}
```
Also verify in DB:
```sql
SELECT "guestName", "guestEmail", "sponsorId" FROM tickets
WHERE "showId" = '11111111-1111-1111-1111-111111111111'
  AND "sponsorId" = 'sponsor-test';
-- Should return 2 rows: Trấn Thành + Sơn Tùng
```

### Test 5 — Idempotency (409)
```json
HTTP/1.1 409 Conflict
{
  "message": "This file has already been queued for this show and sponsor.",
  "job_id": "...",
  "status": "COMPLETED"
}
```

### Test 6 — Wrong Sponsor
Poll status until `COMPLETED`:
```json
{
  "status": "COMPLETED",
  "successCount": 0,
  "errorCount": 2,
  "errorDetails": [
    { "row": 1, "seatNo": "A-1", "reason": "Seat A-1 belongs to sponsor 'sponsor-test', not 'sponsor-other'" },
    { "row": 2, "seatNo": "A-2", "reason": "Seat A-2 belongs to sponsor 'sponsor-test', not 'sponsor-other'" }
  ]
}
```

### Test 8 — Bad Row
Poll status until `COMPLETED`:
```json
{
  "status": "COMPLETED",
  "totalRows": 2,
  "successCount": 1,
  "errorCount": 1,
  "errorDetails": [
    { "row": 1, "seatNo": "A-1", "reason": "Missing required field — ... email=''" }
  ]
}
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `401 Unauthorized` | Token expired — re-run `### 2. Login` and update `@token` |
| `404 Not Found` on job poll | Wrong `job_id` — re-copy from step 3 response |
| Job stays `PENDING` forever | Worker not started — check server logs for `GuestImportProcessor: listening` |
| `File not found` error in job | CSV file missing from `uploads/VIP_CSV/inbox/` |
| Seed data missing (`sponsorId=null`) | Run the SQL UPDATE above to manually set sponsor |
| `409` on first try | DB wasn't cleared — delete the old `import_jobs` row or use a different `filePath` |
