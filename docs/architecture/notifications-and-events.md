# Notifications & Event Architecture: Real-Time Event Dispatch

**Real-Time Engines**: Socket.IO 4.7+ (Node Server) & Spring STOMP Broker (Spring Module)  
**Scope**: Room Scoping, Event Taxonomy, Heartbeats, Serverless Fallbacks  

---

## 1. Real-Time Room & Channel Topology

```mermaid
graph TD
    SERVER[Socket.IO Server Engine]

    subgraph User Personal Channels
        U1[user:1]
        U2[user:2]
        UN[user:N]
    end

    subgraph Departmental Channels
        B_CSE[branch:CSE]
        B_ECE[branch:ECE]
        B_MECH[branch:MECH]
    end

    subgraph Campus Channels
        C_RKV[campus:RK Valley]
        C_NUZ[campus:Nuzvid]
        C_ALL[campus:ALL]
    end

    SERVER --> U1
    SERVER --> U2
    SERVER --> UN
    SERVER --> B_CSE
    SERVER --> B_ECE
    SERVER --> B_MECH
    SERVER --> C_RKV
    SERVER --> C_NUZ
    SERVER --> C_ALL
```

---

## 2. Event Specification Matrix

| Event Name | Direction | Payload Schema | Target Channel | Description |
|---|:---:|---|---|---|
| `join` | Client -> Server | `userId: string` | Direct Socket | Registers socket connection and joins user-specific room. |
| `join_branch` | Client -> Server | `branch: string` | Direct Socket | Joins department room for branch-level notices. |
| `join_campus` | Client -> Server | `campus: string` | Direct Socket | Joins campus room for campus-scoped circulars. |
| `new_message` | Server -> Client | `{ message: MessageObject }` | `user:{receiverId}` | Dispatches real-time encrypted direct chat message. |
| `user_typing` | Server -> Client | `{ userName: string }` | Chat Room | Emits typing indicator to active chat partner. |
| `new_circular` | Server -> Client | `{ circular: CircularObject }`| `campus:{campus}` or Broadcast | Alerts online users of published official circulars. |
| `emergency_alert`| Server -> Client | `{ alert: AlertObject }` | Global Broadcast (`io.emit`) | Triggers emergency siren chime and modal across all sessions. |

---

## 3. Serverless Environment Compatibility (Vercel)

1. **Stateful vs Serverless Divergence**:
   - In containerized environments (Docker, Railway, Render), Socket.IO holds persistent TCP connections.
   - In serverless environments (Vercel Lambdas), continuous WebSocket connections terminate after lambda execution.
2. **Dual-Dispatch Resilience**:
   - Whenever an emergency or circular event is generated, it is concurrently committed to the MySQL `circulars` and `notifications` tables.
   - The frontend's `NotificationContext` implements a 30-second background polling cycle (`/api/notifications/unread`) that guarantees delivery even if WebSocket connection is unavailable.
