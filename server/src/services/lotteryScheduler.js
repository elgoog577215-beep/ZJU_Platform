const { createLotteryService } = require("./lotteryService");
let timer;
let running = false;
async function runDueLotteries(service = createLotteryService()) {
    if (running) return;
    running = true;
    try {
        for (const { id } of await service.due()) {
            try {
                await service.draw(id);
            } catch (error) {
                console.error("[Lottery] Draw failed", id, error.message);
            }
        }
    } finally {
        running = false;
    }
}
function startLotteryScheduler() {
    if (timer) return;
    const tick = () =>
        runDueLotteries().catch((error) =>
            console.error("[Lottery] Scheduler failed", error.message)
        );
    timer = setInterval(tick, 30000);
    timer.unref?.();
    tick();
}
function stopLotteryScheduler() {
    clearInterval(timer);
    timer = null;
}
module.exports = { startLotteryScheduler, stopLotteryScheduler, runDueLotteries };
