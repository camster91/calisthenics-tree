# D10 — WebSocket / realtime strategy

Status: **DRAFT — needs decision before Phase 4**

The Path B social features (friend DAGs, leaderboards, friend-unlock notifications) imply realtime updates. Three options:

## Options

### A. WebSocket (native FastAPI)
- **Pros**: Lowest latency, bidirectional, no third-party dependency.
- **Cons**: Custom reconnection logic, no built-in presence, no fan-out for >1k concurrent users without a separate pub/sub layer.
- **Cost**: Just code. ~2-3 days to implement a basic fan-out via Redis Pub/Sub.
- **At what scale it breaks**: ~5k concurrent WebSocket connections on a single VPS. After that, need a separate WebSocket gateway.

### B. Server-Sent Events (SSE)
- **Pros**: One-directional (server → client), works over HTTP, automatic reconnection in the browser.
- **Cons**: No bidirectional. If we ever need client → server realtime (chat?), we have to add WebSocket anyway.
- **Cost**: Trivial. ~1 day to implement.
- **At what scale it breaks**: ~10k concurrent SSE connections per VPS. Higher than WebSocket because it's simpler.

### C. Polling
- **Pros**: Zero infra. Just `setInterval` + `fetch` in the client.
- **Cons**: Battery drain on mobile. Wastes backend cycles. Latency = poll interval.
- **Cost**: ~4 hours to implement.
- **At what scale it breaks**: Never, if you accept the cost.

### D. Managed service (Pusher, Ably, Supabase Realtime)
- **Pros**: Done. Presence, fan-out, reconnection all handled. Scales to millions.
- **Cons**: Monthly cost ($49-99/mo at our scale). Vendor lock-in. Yet another auth integration.
- **Cost**: Code is fast; budget is ongoing.

## Decision

**Phase 4: SSE.** Simple, HTTP-based, automatic reconnection. One direction is fine for friend-unlock pushes. Start here.

**Phase 5+: Re-evaluate.** If we add chat or live workout coaching (we won't), upgrade to WebSocket or move to managed service. The SSE-to-WebSocket migration is mostly client-side.

## What we explicitly do NOT build

- Presence indicators ("Cam is online right now"). YAGNI for a fitness app. We don't need to know if Bianca is "available" to spot her front lever.
- Typing indicators. Same reason.
- Live cursors on the social feed. Same reason.

## Architecture (when we get there)

```
client (web/native)
  ↓ GET /api/v1/feed/stream (SSE)
  ↓
FastAPI route handler
  ↓ subscribe to Redis Pub/Sub channel "feed:user_<id>"
  ↓
arq worker publishes when friend unlocks a node
```

## Action
Phase 4 native shell. T23 (Friend DAGs) implements the SSE endpoint + Redis Pub/Sub fan-out.