# Plan: shared client tracker (Firebase), for later

Status: **not started.** John wants to come back to this. Nothing below is built yet.

## Why

Today the client tracker (`clients.html`) saves everything in one browser
(`localStorage`, key `clients-v1`). That means:

- The phone and the office computer each have their own separate client list.
- Backups are manual (Download backup / Restore backup).
- Nobody else in the office can see or help with a file.

## Goal

1. John's clients, notes, conditions and milestones are the same on every device.
2. **Other loan officers in the office can sign in too, and collaborate**:
   each LO has their own clients, and files can be shared or viewed by the team.
3. Keep the pages, emails and buttons working the way they do now.

## Approach: Firebase (Google)

- **Firebase Authentication**: "Sign in with Google" (each LO uses their own Google account).
- **Cloud Firestore**: the database for clients, notes, conditions, milestones.
- Works with the existing GitHub Pages site; no server to run.
- Free "Spark" plan should cover a small office.

### Data model (draft)

- `users/{uid}`: name, email, role (`admin` or `lo`), active.
- `clients/{clientId}`: same fields as today's client object, plus
  `ownerUid` (the LO on the file), `sharedWith` (list of uids, or "team"),
  `createdBy`, `updatedBy`, `updatedAt`.
- Notes and conditions can stay inside the client document at first; move to
  sub-collections (`clients/{id}/notes`, `.../conditions`) if files get large or
  several people edit at once.

### Access rules (draft)

- An LO can read and write their own clients and clients shared with them.
- An `admin` (John) can see all clients and add or remove LOs.
- No one without a signed-in, approved account can read anything.
- Rules live in Firestore security rules, so the public site code stays safe to publish.

### Steps when we pick this up

1. **Check with compliance or IT**: borrower information would be stored with Google Cloud.
2. John creates a Firebase project (free), turns on Google sign-in and Firestore,
   and shares the web config snippet (not a secret).
3. Add sign-in to the pages; show who is signed in in the top bar.
4. Move the client tracker from `localStorage` to Firestore (with offline support).
5. Import John's existing clients from a backup file.
6. Add an "LOs" admin screen: invite or approve LOs, set roles.
7. Add an "Assigned LO" field and filters ("My clients" / "Team").
8. Optional later: notifications (email or push) for changes such as
   conditions added, milestone checked, closing scheduled.
9. Test on computer and phone; keep "Download backup" as an export.

## Other notes

- The document request page and email builders don't need the database.
- The upload link and sign-off are saved per browser today; they could move to the
  user's profile in Firestore.
