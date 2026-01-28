# Support List Protocol

## Summary

This NIP defines a protocol for collaborative task lists where a list owner can create tasks that guests can claim and complete using shared Nostr keypairs.

## Event Kinds

- `30078`: Support List State (Application-specific data as defined in NIP-78)

## Event Structure

### Support List State (Kind 30078)

A replaceable event that stores the current state of a support list. Both owner and guest can publish updates to this event.

```json
{
  "kind": 30078,
  "content": "<JSON-encoded list data>",
  "tags": [
    ["d", "support-list"],
    ["p", "<owner-pubkey>"],
    ["p", "<guest-pubkey>"]
  ],
  "pubkey": "<owner-pubkey or guest-pubkey>",
  "created_at": <timestamp>,
  "id": "<event-id>",
  "sig": "<signature>"
}
```

#### Content Structure

```json
{
  "title": "<list-title>",
  "items": [
    {
      "id": "<unique-item-id>",
      "title": "<task-title>",
      "status": "pending" | "claimed" | "complete",
      "claimedBy": "<optional-name-of-person-who-claimed>",
      "note": "<optional-note>",
      "order": <numeric-order>
    }
  ],
  "guestPubkey": "<guest-view-pubkey>",
  "createdAt": <timestamp>,
  "updatedAt": <timestamp>
}
```

## Protocol Flow

### List Creation

1. Owner generates two keypairs:
   - Owner keypair: Used to manage list structure (add/remove/reorder items)
   - Guest keypair: Shared via URL for guest access

2. Owner publishes initial kind 30078 event with list title and empty items array

3. Share link format: `https://example.com/list/<guest-nsec>`

### Guest Access

1. Guests receive a URL containing the guest nsec: `/list/<guest-nsec>`
2. Guest nsec is decoded to derive both guest and owner pubkeys
3. Client queries for most recent kind 30078 event from both owner and guest pubkeys
4. Guests can update item status and notes by publishing kind 30078 events signed with the guest key

### Event Publishing

- **Owner**: Publishes kind 30078 when adding, removing, or reordering items
- **Guest**: Publishes kind 30078 when updating item status (pending/claimed/complete) or adding notes
- **Conflict Resolution**: Most recent event (by `created_at`) takes precedence
- Both include `p` tags referencing owner and guest pubkeys for discoverability

### Owner Actions

1. Owner authenticates with owner nsec
2. Owner can:
   - Add new items to the list
   - Delete items from the list
   - Reorder items (via drag-and-drop or up/down arrows)
   - Update list title
   - View all guest updates

### Guest Actions

1. Guest accesses via shared link (no authentication needed)
2. Guest can:
   - View all list items
   - Claim tasks (change status to "claimed")
   - Mark tasks as complete
   - Reopen completed tasks
   - Add optional name when claiming ("claimed by")
   - Add notes to tasks

## Security Model

- **Owner Private Key**: Full control over list structure and content
- **Guest Private Key**: Can update task status, add notes, and claim tasks
- **Shared State**: Both owner and guest publish kind 30078 events
- **Conflict Resolution**: Last-write-wins based on `created_at` timestamp
- **Access Control**: Knowledge of guest nsec URL grants access

## Implementation Notes

- Uses kind 30078 (Application-specific data per NIP-78)
- Dual-source state: Events from both owner and guest pubkeys
- Most recent event determines current state
- Guest nsec is embedded in shareable URL for simplified access
- No encryption (events are public on relays)
- Items are automatically grouped by status: pending → claimed → complete

## Privacy Considerations

### With Encryption (v2.0+)

- ✅ **Item data is encrypted** using NIP-44 with owner/guest conversation key
- ✅ **Only link holders can decrypt** - requires either owner or guest private key
- ✅ **Relay operators cannot read** encrypted task titles, notes, or claimed-by names
- ✅ **Public metadata only** - Event structure and d-tags are visible, content is encrypted
- ⚠️ **Status and order remain unencrypted** for proper list organization
- ⚠️ **Guest nsec in URL** - Anyone with the link can access and modify the list
- ⚠️ **No server-side access control** - Security depends on keeping links private

### Legacy Items (Pre-encryption)

- Items created before encryption was enabled remain unencrypted
- These items display with 🔓 icon to indicate they are not private
- Can be viewed by anyone querying the relay
- Consider recreating old lists if privacy is important

### Security Model

**What's Protected:**
- Task titles ✅
- Task notes ✅
- "Claimed by" names ✅

**What's NOT Protected:**
- Number of items in the list ❌
- Item status (pending/claimed/complete) ❌
- Item order ❌
- Existence of the list ❌
- Update timestamps ❌

**Best Practices:**
- Keep owner and guest links private (treat them like passwords)
- Only share guest link with people you trust
- Recreate lists periodically to ensure all items are encrypted
- Don't include highly sensitive information even in encrypted items

## Encryption (NIP-44)

**Version 2.0+**: Items are encrypted using NIP-44 for privacy.

### Encrypted Item Structure

When an item is encrypted, its sensitive data (title, note, claimedBy) is encrypted using NIP-44:

```json
{
  "id": "<unique-item-id>",
  "title": "ENC:<nip44-encrypted-payload>",
  "status": "pending",
  "order": 0,
  "encrypted": true
}
```

The encrypted payload contains:
```json
{
  "title": "<actual-task-title>",
  "note": "<optional-note>",
  "claimedBy": "<optional-name>"
}
```

### Encryption Key Derivation

- **Conversation Key**: Derived from owner private key + guest public key (and vice versa)
- **Encryption Algorithm**: NIP-44 v2
- Both owner and guest can decrypt items using their respective keys

### Backwards Compatibility

- **Old items** (without `encrypted: true`) remain unencrypted for backwards compatibility
- **New items** are automatically encrypted when created or updated
- Clients display encryption status with lock icons:
  - 🔒 Green lock = Encrypted
  - 🔓 Yellow unlock = Not encrypted (legacy)

## Example Flow

1. Alice creates a "Moving Day Tasks" list
2. Alice gets owner link: `https://app.com/list/nsec1guest...?owner=nsec1owner...` (keeps private)
3. Alice gets guest link: `https://app.com/list/nsec1guest...` (shares with friends)
4. Bob clicks guest link and sees the task list
5. Bob claims "Pack kitchen boxes" by clicking "Claim"
6. Bob's client encrypts the update and publishes kind 30078 event
7. Alice sees Bob's update in real-time via relay subscription (decrypted automatically)
8. Alice adds more tasks using her owner view (automatically encrypted)
9. Both Alice and Bob see the merged current state with decrypted items
10. Anyone else querying the relay sees only encrypted data
