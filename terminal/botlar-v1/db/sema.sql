-- Botlar V1 veritabanı şeması (PostgreSQL 18)
CREATE TABLE IF NOT EXISTS signals (
  src_file    text        NOT NULL,          -- signals-YYYY-MM-DD.jsonl
  src_line    integer     NOT NULL,          -- dosyadaki satır no (1'den) — aynı satır iki kez girmez
  t           timestamptz NOT NULL,          -- sinyal anı
  bot         text        NOT NULL,
  symbol      text        NOT NULL,
  dir         text,                           -- up | down | null
  strategy    text,
  price       double precision,
  prev_price  double precision,
  boost_pct   double precision,
  module      text,
  rsi         jsonb,
  srsi        jsonb,
  fields      jsonb,
  text        text,
  event_time  timestamptz,
  seen_at     timestamptz,
  PRIMARY KEY (src_file, src_line)
);
CREATE INDEX IF NOT EXISTS signals_bot_t    ON signals (bot, t);
CREATE INDEX IF NOT EXISTS signals_symbol_t ON signals (symbol, t);
CREATE INDEX IF NOT EXISTS signals_t        ON signals (t);

-- Yazıcının kaldığı yer (dosya başına)
CREATE TABLE IF NOT EXISTS ingest_state (
  src_file  text PRIMARY KEY,
  byte_pos  bigint  NOT NULL DEFAULT 0,
  line_no   integer NOT NULL DEFAULT 0,
  file_size bigint,
  updated   timestamptz NOT NULL DEFAULT now()
);

-- Kasa — asıl kayıt burasıdır (11.11.2026'dan beri; eski data\kasa.json arşivlendi)
CREATE TABLE IF NOT EXISTS kasa_periods (
  id integer PRIMARY KEY, start date NOT NULL, capital numeric(14,2) NOT NULL, closed_at date
);
CREATE TABLE IF NOT EXISTS kasa_trades (
  id integer PRIMARY KEY, period_id integer NOT NULL REFERENCES kasa_periods(id),
  coin text, date date NOT NULL, time text, kasa numeric(14,2), pnl numeric(14,2), note text, bot text, dir text
);
