export type Room = { id: string; slug: string; name: string; topic: string | null; kind: 'world'|'country'|'interest'|'custom'; is_private: boolean }
export type Message = { id: string; room_id: string; sender_id: string; body: string; created_at: string; edited_at: string | null; deleted_at: string | null }
