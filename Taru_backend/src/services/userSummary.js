const MODAL_TIMEOUT_MS = 90000;
const RETRY_WINDOW_MS = 60000;
const RETRY_DELAY_MS = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateUserSummary(userId) {
  const baseUrl = process.env.MODAL_CHATBOT_BASE_URL;
  const apiKey = process.env.MODAL_CHATBOT_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error("Modal summary service is not configured");
  }

  const deadline = Date.now() + RETRY_WINDOW_MS;

  while (true) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, MODAL_TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}/summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          user_id: String(userId),
        }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        return data;
      }

      if (response.status === 404) {
        return null;
      }

      if (response.status === 503 && Date.now() < deadline) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      const error = new Error("Modal summary request failed");
      error.statusCode = response.status;
      throw error;
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }

      const timeoutError = new Error("Modal summary request timed out");
      timeoutError.statusCode = 504;
      throw timeoutError;
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = {
  generateUserSummary,
};
