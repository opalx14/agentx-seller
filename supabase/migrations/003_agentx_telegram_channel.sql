alter table public.agentx_conversations
  drop constraint if exists agentx_conversations_channel_check;

alter table public.agentx_conversations
  add constraint agentx_conversations_channel_check
  check (channel in ('web', 'whatsapp', 'telegram'));
