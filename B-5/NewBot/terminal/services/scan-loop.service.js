function createScanLoop(scan, intervalMs, options = {}) {
  const schedule = options.schedule || setTimeout;
  const cancel = options.cancel || clearTimeout;
  let running = false, stopped = false, timer = null;
  async function run() {
    if (stopped || running) return;
    if (timer !== null) cancel(timer);
    timer = null;
    running = true;
    try {
      await scan();
    } catch (error) {
      if (options.onError) options.onError(error);
    } finally {
      running = false;
      if (!stopped) timer = schedule(run, intervalMs);
    }
  }
  return { run, stop() { stopped = true; if (timer !== null) cancel(timer); timer = null; } };
}
module.exports = { createScanLoop };
