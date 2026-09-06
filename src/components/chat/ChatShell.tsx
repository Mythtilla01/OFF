import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../integrations/supabase/client";
import { canPostToRoom } from "../../services/rooms/permissions";
import {
  reconcileMessage,
  validateMessageBody,
  type PendingMessage,
} from "../../services/chat/messages";
import type { Room } from "../../services/chat/types";
export function ChatShell({ session }: { session: Session }) {
  const [rooms, setRooms] = useState<Room[]>([]),
    [active, setActive] = useState<Room | null>(null),
    [messages, setMessages] = useState<PendingMessage[]>([]),
    [draft, setDraft] = useState(""),
    [error, setError] = useState(""),
    [nav, setNav] = useState(false);
  useEffect(() => {
    supabase
      ?.from("rooms")
      .select("id,slug,name,topic,kind,is_private")
      .order("name")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else {
          const next = (data ?? []) as Room[];
          setRooms(next);
          setActive(next[0] ?? null);
        }
      });
  }, []);
  useEffect(() => {
    const client = supabase;
    if (!client || !active) return;
    setMessages([]);
    client
      .from("messages")
      .select(
        "id,room_id,thread_id,sender_id,body,client_event_id,created_at,edited_at,deleted_at,profiles(id,username,display_name,avatar_url)",
      )
      .eq("room_id", active.id)
      .is("deleted_at", null)
      .order("created_at")
      .then(({ data, error }) =>
        error
          ? setError(error.message)
          : setMessages((data ?? []) as PendingMessage[]),
      );
    const channel = client
      .channel(`room:${active.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${active.id}`,
        },
        (payload) =>
          setMessages((current) =>
            reconcileMessage(current, payload.new as PendingMessage),
          ),
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [active]);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !active) return;
    const checked = validateMessageBody(draft);
    if (checked.error) return setError(checked.error);
    const client_event_id = crypto.randomUUID(),
      optimistic: PendingMessage = {
        id: `local-${client_event_id}`,
        room_id: active.id,
        thread_id: null,
        sender_id: session.user.id,
        body: checked.value,
        client_event_id,
        created_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
        pending: true,
      };
    setDraft("");
    setError("");
    setMessages((x) => [...x, optimistic]);
    const { data, error } = await supabase
      .from("messages")
      .insert({
        room_id: active.id,
        sender_id: session.user.id,
        body: checked.value,
        client_event_id,
      })
      .select(
        "id,room_id,thread_id,sender_id,body,client_event_id,created_at,edited_at,deleted_at",
      )
      .single();
    if (error) {
      setMessages((x) =>
        x.filter((m) => m.client_event_id !== client_event_id),
      );
      setError(error.message);
    } else setMessages((x) => reconcileMessage(x, data as PendingMessage));
  }
  const select = (room: Room) => {
    setActive(room);
    setNav(false);
  };
  return (
    <main className="app">
      <button
        className="mobile-menu"
        onClick={() => setNav(!nav)}
        aria-expanded={nav}
      >
        Rooms
      </button>
      <aside className={nav ? "mobile-open" : ""}>
        <div className="brand">
          OFF <small>OPEN FREEDOM FORUM</small>
        </div>
        <nav aria-label="Rooms">
          <p>COMMUNITIES</p>
          {rooms.map((room) => (
            <button
              className={active?.id === room.id ? "selected" : ""}
              key={room.id}
              onClick={() => select(room)}
            >
              <span>#</span>
              {room.name}
            </button>
          ))}
          <p>DIRECT MESSAGES</p>
          <button disabled>Coming in the next phase</button>
        </nav>
        <div className="account">
          <span>{session.user.user_metadata.username ?? "member"}</span>
          <button onClick={() => supabase?.auth.signOut()}>Sign out</button>
        </div>
      </aside>
      <section className="conversation">
        <header>
          <div>
            <p className="eyebrow">{active?.kind ?? "ROOM"}</p>
            <h1>{active ? `# ${active.name}` : "Loading rooms…"}</h1>
            <p>
              {active?.topic ?? "A shared space for considered discussion."}
            </p>
          </div>
          <span className="presence">● LIVE</span>
        </header>
        <div className="messages" aria-live="polite">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {messages.length === 0 && active && (
            <div className="empty">
              No messages yet. Start the conversation.
            </div>
          )}
          {messages.map((message) => (
            <article key={message.id}>
              <div className="avatar">
                {(message.profile?.username ?? message.sender_id)
                  .slice(0, 1)
                  .toUpperCase()}
              </div>
              <div>
                <b>
                  {message.sender_id === session.user.id
                    ? "You"
                    : message.profile?.display_name ||
                      message.profile?.username ||
                      "Unknown member"}
                </b>
                <time>
                  {new Intl.DateTimeFormat(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(message.created_at))}
                </time>
                <p>{message.body}</p>
              </div>
            </article>
          ))}
        </div>
        <form className="composer" onSubmit={send}>
          <label className="sr-only" htmlFor="message">
            Message
          </label>
          <input
            id="message"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={active ? "Write a message…" : "Choose a room"}
            disabled={!canPostToRoom(active)}
          />
          <button aria-label="Send message" disabled={!canPostToRoom(active)}>
            ↑
          </button>
        </form>
      </section>
      <aside className="details">
        <p className="eyebrow">ROOM NOTES</p>
        <h2>{active?.name ?? "OFF"}</h2>
        <p>{active?.topic ?? "Select a room to see its details."}</p>
        <hr />
        <p className="eyebrow">PRIVACY</p>
        <p>
          Messages are not end-to-end encrypted in this MVP. Do not share
          secrets.
        </p>
      </aside>
    </main>
  );
}
