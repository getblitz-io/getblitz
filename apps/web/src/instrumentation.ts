export async function register() {
  // eslint-disable-next-line turbo/no-undeclared-env-vars, no-restricted-properties
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const {
      initWebhookWorker,
      initExpireSessionsWorker,
      initCleanupBankConnectionsWorker,
      initCheckTokenHealthWorker,
    } = await import("@getblitz/api");

    initWebhookWorker();
    initExpireSessionsWorker();
    initCleanupBankConnectionsWorker();
    initCheckTokenHealthWorker();
  }
}
