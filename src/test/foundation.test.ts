import { describe, expect, it } from "vitest";
import { validateUsername } from "../services/auth/username";
import {
  validateMessageBody,
  reconcileMessage,
} from "../services/chat/messages";
import { canPostToRoom, isDiscoverable } from "../services/rooms/permissions";
import { profileLabel, profileMap } from "../services/profiles/map";
import { normalizeCountryCode } from "../services/geo/country";
describe("foundation services", () => {
  it("validates pseudonymous usernames", () => {
    expect(validateUsername("off_user")).toBeNull();
    expect(validateUsername("no!")).toBeTruthy();
  });
  it("validates message bodies", () => {
    expect(validateMessageBody("  ").error).toBeTruthy();
    expect(validateMessageBody("hello").value).toBe("hello");
  });
  it("reconciles an optimistic event without duplication", () => {
    const local = {
      id: "local-a",
      room_id: "r",
      thread_id: null,
      sender_id: "u",
      body: "hi",
      client_event_id: "event-a",
      created_at: "now",
      edited_at: null,
      deleted_at: null,
      pending: true,
    };
    const saved = { ...local, id: "db-a" };
    expect(reconcileMessage([local], saved)).toEqual([
      { ...saved, pending: false },
    ]);
    expect(
      reconcileMessage([{ ...saved, pending: false }], saved),
    ).toHaveLength(1);
  });
  it("enforces room participation semantics", () => {
    const interest = {
      id: "1",
      slug: "x",
      name: "X",
      topic: null,
      kind: "interest" as const,
      is_private: false,
      is_member: false,
    };
    expect(canPostToRoom(interest)).toBe(false);
    expect(isDiscoverable({ ...interest, is_private: true }, false)).toBe(
      false,
    );
  });
  it("maps profiles and country codes", () => {
    const profile = {
      id: "u",
      username: "ada",
      display_name: null,
      avatar_url: null,
    };
    expect(profileLabel(profile)).toBe("ada");
    expect(profileMap([profile]).get("u")).toEqual(profile);
    expect(normalizeCountryCode(" us ")).toBe("US");
    expect(normalizeCountryCode("bad")).toBe("XX");
  });
});
