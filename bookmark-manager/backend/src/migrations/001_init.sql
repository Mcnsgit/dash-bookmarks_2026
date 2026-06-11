-- Self-Hosted Bookmark Manager schema --------------------------------------
-- PostgreSQL 16+

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- USERS --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT        UNIQUE NOT NULL,
  display_name TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FOLDERS (hierarchical) ---------------------------------------------------
CREATE TABLE IF NOT EXISTS folders (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id  UUID        REFERENCES folders(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  color      TEXT        DEFAULT '#6366f1',
  icon       TEXT        DEFAULT 'folder',
  position   INTEGER     DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_folders_user   ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);

-- TAGS ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  color   TEXT DEFAULT '#94a3b8',
  UNIQUE(user_id, name)
);
CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id);

-- BOOKMARKS ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookmarks (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id        UUID        REFERENCES folders(id) ON DELETE SET NULL,
  url              TEXT        NOT NULL,
  url_normalized   TEXT,
  title            TEXT        NOT NULL,
  description      TEXT,
  favicon_url      TEXT,
  og_image_url     TEXT,
  screenshot_path  TEXT,
  domain           TEXT,
  is_pinned        BOOLEAN     DEFAULT false,
  is_archived      BOOLEAN     DEFAULT false,
  visit_count      INTEGER     DEFAULT 0,
  last_visited_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_vector    TSVECTOR
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user        ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_folder      ON bookmarks(folder_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_domain      ON bookmarks(domain);
CREATE INDEX IF NOT EXISTS idx_bookmarks_url_norm    ON bookmarks(url_normalized);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created     ON bookmarks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_search_gin  ON bookmarks USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_bookmarks_title_trgm  ON bookmarks USING GIN(title gin_trgm_ops);

-- Auto-update search_vector
CREATE OR REPLACE FUNCTION bookmarks_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title,'')),       'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.url,'')),         'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.domain,'')),      'D');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bookmarks_tsv_update ON bookmarks;
CREATE TRIGGER bookmarks_tsv_update BEFORE INSERT OR UPDATE
  ON bookmarks FOR EACH ROW EXECUTE FUNCTION bookmarks_tsv_trigger();

-- BOOKMARK_TAGS (M2M) ------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookmark_tags (
  bookmark_id UUID NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES tags(id)      ON DELETE CASCADE,
  PRIMARY KEY (bookmark_id, tag_id)
);

-- TAB SESSIONS -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tab_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON tab_sessions(user_id);

CREATE TABLE IF NOT EXISTS session_bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES tab_sessions(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  title       TEXT,
  favicon_url TEXT,
  position    INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_session_bm_session ON session_bookmarks(session_id);

-- READING LIST -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reading_list (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bookmark_id UUID REFERENCES bookmarks(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  title       TEXT,
  priority    INTEGER DEFAULT 2,        -- 1 high, 2 medium, 3 low
  is_read     BOOLEAN DEFAULT false,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_reading_user ON reading_list(user_id);

-- NOTES --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id  UUID REFERENCES folders(id) ON DELETE SET NULL,
  title      TEXT NOT NULL,
  content    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notes_user   ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id);

-- IMPORT HISTORY -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source          TEXT,           -- chrome, firefox, json, ...
  filename        TEXT,
  total_count     INTEGER DEFAULT 0,
  imported_count  INTEGER DEFAULT 0,
  skipped_count   INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  analysis        JSONB,
  status          TEXT DEFAULT 'completed',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_import_user ON import_history(user_id);

-- VIKUNJA TASKS (cache / mapping) -----------------------------------------
CREATE TABLE IF NOT EXISTS vikunja_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bookmark_id UUID REFERENCES bookmarks(id) ON DELETE SET NULL,
  vikunja_id  INTEGER NOT NULL,
  project_id  INTEGER,
  title       TEXT,
  done        BOOLEAN DEFAULT false,
  due_date    TIMESTAMPTZ,
  synced_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vikunja_user ON vikunja_tasks(user_id);
