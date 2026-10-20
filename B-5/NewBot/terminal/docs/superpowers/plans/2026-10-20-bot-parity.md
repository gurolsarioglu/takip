# Bot Parity Implementation Plan

> **For agentic workers:** Execute sequentially in this session; user approved the audit's ordering. Use executing-plans task checkpoints. Reviewers receive file paths and specific requirements only.

**Goal:** Correct local signal data first, then measure independent signal agreement with Visivero.

**Architecture:** Retain existing Node/CommonJS runners and Hub. Introduce small shared data/formatting/scheduling functions, avoid a replacement UI. Separate reference observations from production signals.

**Tech Stack:** Node.js, node:test/assert, VM-isolated legacy modules, Express, existing browser tooling.

## 20.10.2026 uygulama durumu

- Görev 1–3 uygulandı ve izole testlerle doğrulandı.
- Görev 4: TTL/in-flight paylaşımı, Hub mum rotası ve bağımsız seri taramalar uygulandı. Hub arızasındaki runner doğrudan Binance fallback'i ve süreçler arası global istek bütçesi hâlâ açık.
- Görev 5: ana runner/merkezi karar kapıları ortak modüle taşındı. Aday seçimi, ölçüm penceresi ve legacy ingest yolları tam eşdeğer değil. Eşikler referans algoritması olarak doğrulanmadı.
- Görev 6 bekliyor: kurulum/teyit/geçersizleşme kuralları için yeterli kanıt yok; metadata alanlarının desteklenmesi yaşam döngüsünün tamamlandığı anlamına gelmez.
- Görev 7: yetkili oturumda 180 geçmiş mesaj incelendi; örnekler, saat ölçümleri ve çevrimdışı karşılaştırıcı kaydedildi. Eşzamanlı yerel/referans pencere ve eşleşme oranı henüz yok.
- Son doğrulama: `test:bots` 42/42; mevcut regresyon 8/8; 55 üretim JS dosyasında sözdizimi temiz. Eski followup harness'i `review.changeCoin` hatası nedeniyle ayrıca onarılmalı. Tam ağ/quant paketi canlı arşive yazabildiğinden çalıştırılmadı.
- Kullanıcı açıklaması: veri ortak, botlar scalp/swing için farklı zaman dilimi ve stratejilerle bağımsızdır. Kararlar birleştirilmeyecek. Bilgisayar saati düzeltildi; eski yaklaşık +296 sn ofset yeni gözlemlere uygulanmayacak.

Aşağıdaki onay kutuları ilk planın kayıtlarıdır; teslim durumu bu bölümde ayrıntılı belirtilmiştir.

## Task 1: Precision and data contract

- [ ] Add failing tests in `review/bot-data-correctness.test.cjs`: micro-price EMA/pivot, same EMA definition in history, unavailable sentiment, normalized longPct.
- [ ] Run `node --test review/bot-data-correctness.test.cjs` and confirm assertion failures.
- [ ] Update `services/quant-indicators.service.js`, `services/history.service.js`; add `services/bot-data.service.js` for finite numeric fields, funding display, measured price change and sentiment extraction.
- [ ] Run the targeted tests; inspect failures before any next edit.

## Task 2: Runner truthfulness

- [ ] Add isolated runner tests for a 20% long ratio, missing sentiment, real previous price, missing funding baseline, actual nextFundingTime and failed delivery.
- [ ] Update `bots/runners/*.runner.js` to use measured prices and unknown HTF values rather than constants; normalize sentiment API/fallback contracts.
- [ ] Keep current intrabar trigger semantics until reference evidence selects the policy.
- [ ] Run tests and confirm no fabricated values in the runner output.

## Task 3: Persistence and actual acceptance

- [ ] Test same candle after restart, full metadata preservation and rejected duplicate returning no affected bot.
- [ ] Update `bots/base/base-bot.js`, `services/signal-store.service.js`, `bots/index.js`, `bots/controllers/bot.controller.js`.
- [ ] Store plain allowlisted signal fields; no session secrets or arbitrary request fields.
- [ ] Verify in memory/VM, without touching `data/*.json`.

## Task 4: Fresh shared data and non-overlap

- [ ] Test cache TTL, concurrent deduplication, candle rollover, bounded history and retry after failure.
- [ ] Update `services/market-data-engine.service.js`; add a shared async cache and serial scan helper if needed. Hub kline requests should share engine data, preserving Binance array response shape for callers.
- [ ] Replace overlapping runner intervals with a self-scheduling scan loop; retain prior poll periods as provisional configuration.
- [ ] Run local deterministic tests; no live bot startup or Telegram emission during tests.

## Task 5: One strategy definition

- [ ] Extract pure decision functions to `bots/strategy-rules.js`, with explicit inputs, minimum history and source metadata.
- [ ] Test runner/central agreement on the same fixture, including threshold boundaries and missing inputs.
- [ ] Use these rules from both entry points, with legacy ingest behavior documented and isolated.

## Task 6: Signal lifecycle

- [ ] Establish setup/confirmation/invalidation rules from reference evidence; do not invent transitions when evidence is missing.
- [ ] Persist lifecycle identity, state, event time and rule version with the signal metadata.
- [ ] Test repeated observations, confirmation, invalidation and restart behavior using recorded fixtures.
- [ ] If evidence does not establish transitions, mark this task pending and continue reference observation without claiming lifecycle or parity complete.

## Task 7: Reference evidence and comparison

- [ ] Inspect authorized browser session; ask user to sign in directly if needed. Use REA where available and record its limitations.
- [ ] Save observed bot fields and timing resolution without credentials. Prepare offline one-to-one comparator and test missing/extra/direction/time-tolerance scenarios.
- [ ] Capture bounded reference/local windows and report per-bot agreement and timing. Do not claim parity before real paired observations exist.
- [ ] Update `proje takip.md` with completed and pending items. Commit/push only task-scoped files when repository permissions permit; never include dirty market data or sibling projects.
