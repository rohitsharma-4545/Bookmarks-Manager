# ⌘ Marks — Bookmark Manager

A minimal bookmark manager built with **Next.js**, **Supabase**, and **Tailwind CSS**. Save, view, and delete bookmarks in real time with Google OAuth authentication.

---

## Tech Stack

- **Next.js 16** (App Router)
- **Supabase** — Auth, PostgreSQL, Realtime
- **Tailwind CSS**
- **TypeScript**

---

## Features

- Google OAuth login
- Add and delete bookmarks
- Real-time sync across tabs (Supabase Realtime)
- Per-user data with Row Level Security

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-username/bookmark-manager.git
cd bookmark-manager
npm install
```

### 2. Set up Supabase

Create a project at [supabase.com](https://supabase.com) and run this in the SQL editor:

```sql
create table bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  url text not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table bookmarks enable row level security;

create policy "Users can view own bookmarks"
  on bookmarks for select using (auth.uid() = user_id);

create policy "Users can insert own bookmarks"
  on bookmarks for insert with check (auth.uid() = user_id);

create policy "Users can delete own bookmarks"
  on bookmarks for delete using (auth.uid() = user_id);

-- Required for Realtime delete events to include old row data
alter table bookmarks replica identity full;
```

### 3. Configure environment variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Enable Google OAuth

In Supabase → **Authentication → Providers → Google**, add your Google OAuth credentials. Set the redirect URL to:

```
https://your-project.supabase.co/auth/v1/callback
```

### 5. Run the app

```bash
npm run dev
```

---

## Project Structure

```
app/
├── page.tsx              # Login page
├── dashboard/
│   └── page.tsx          # Main bookmarks dashboard
└── auth/
    └── callback/
        └── route.ts      # OAuth redirect handler
lib/
└── supabase.ts           # Supabase client
```

---

## Problems I Ran Into & How I Solved Them

### 1. Delete button wasn't working

**Problem:** Clicking delete did nothing — no error, no UI change.

**Cause:** Two issues combined. First, the delete query was fire-and-forget with no error handling, so failures were silent. Second, there was no RLS (Row Level Security) policy for `DELETE` on the bookmarks table — Supabase was silently blocking the operation.

**Fix:** Added a `DELETE` RLS policy so users can only delete their own bookmarks, and updated the function to `await` the result and log any errors:

```sql
create policy "Users can delete own bookmarks"
  on bookmarks for delete using (auth.uid() = user_id);
```

```ts
const deleteBookmark = async (id: string) => {
  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("id", id)
    .eq("user_id", userId!);

  if (error) console.error("Delete failed:", error.message);
};
```

---

### 2. Realtime delete events weren't firing

**Problem:** After deleting a bookmark, the UI wouldn't update unless the page was refreshed.

**Cause:** Supabase Realtime needs the full old row data to fire a `DELETE` event. By default, tables only track the primary key on delete.

**Fix:** Ran this in the SQL editor to include the full row in delete payloads:

```sql
alter table bookmarks replica identity full;
```

---
