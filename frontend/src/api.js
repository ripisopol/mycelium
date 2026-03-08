const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
const KEY  = import.meta.env.VITE_API_KEY  ?? "";

async function req(method, path, body) {
  const isWrite = method !== "GET";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(isWrite ? { "X-API-Key": KEY } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}

export const api = {
  listNotes:    ()         => req("GET",    "/notes"),
  getNote:      (id)       => req("GET",    `/notes/${id}`),
  createNote:   (body)     => req("POST",   "/notes/", body),
  updateNote:   (id, body) => req("PUT",    `/notes/${id}`, body),
  deleteNote:   (id)       => req("DELETE", `/notes/${id}`),
  getGraph:     ()         => req("GET",    "/graph"),
  search:       (q)        => req("GET",    `/search?q=${encodeURIComponent(q)}`),
  listTags:     ()         => req("GET",    "/search/tags"),
  notesByTag:   (tag)      => req("GET",    `/search/by-tag?tag=${encodeURIComponent(tag)}`),
};