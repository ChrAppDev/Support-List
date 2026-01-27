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

- List content is **public** on relays (anyone who queries can see events)
- Guest access is gated by knowledge of the guest nsec URL
- The guest nsec in the URL is a shared secret - anyone with it can update the list
- For truly private lists, implement NIP-59 gift wrapping (future enhancement)
- Consider security implications of sharing guest nsec via URL

## Example Flow

1. Alice creates a "Moving Day Tasks" list
2. Alice gets owner nsec: `nsec1owner...` (keeps private)
3. Alice gets guest link: `https://app.com/list/nsec1guest...` (shares with friends)
4. Bob clicks guest link and sees the task list
5. Bob claims "Pack kitchen boxes" by clicking "Claim Task"
6. Bob's client publishes kind 30078 event with updated item status
7. Alice sees Bob's update in real-time via relay subscription
8. Alice adds more tasks using her owner view
9. Both Alice and Bob see the merged current state
