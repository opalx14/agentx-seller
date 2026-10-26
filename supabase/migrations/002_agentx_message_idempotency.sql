create unique index if not exists agentx_messages_external_message_id_idx
  on public.agentx_messages(external_message_id)
  where external_message_id is not null;
