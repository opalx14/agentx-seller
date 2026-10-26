# Channel platforms

External messaging channels live here instead of `src/lib`.

- `telegram/` — Bot API transport, account linking, language/menu UX, polling support.
- `whatsapp/` — Meta Cloud API outbound client and webhook handling.

Each platform adapts external events into the shared AgentX core (`processCustomerMessage`, repository, policy and commerce tools). Platform code must not reimplement ownership, refund, return or escalation policy.
