const MODAL_TIMEOUT_MS = 90000;
const RETRY_WINDOW_MS = 60000;
const RETRY_DELAY_MS = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestModalChat({ userId, message }) {
  const baseUrl = process.env.MODAL_CHATBOT_BASE_URL;
  const apiKey = process.env.MODAL_CHATBOT_API_KEY;

  if (!baseUrl || !apiKey) {
    const error = new Error("Chatbot service is not configured");
    error.statusCode = 500;
    throw error;
  }

  const deadline = Date.now() + RETRY_WINDOW_MS;

  while (true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, MODAL_TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          user_id: String(userId),
          message,
        }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        if (typeof data.response !== "string") {
          const error = new Error("Invalid chatbot response");
          error.statusCode = 502;
          throw error;
        }

        return data;
      }

      if (response.status === 503 && Date.now() < deadline) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      const error = new Error(
        response.status === 503
          ? "The wellbeing assistant is temporarily unavailable. Please try again shortly."
          : "The wellbeing assistant could not process your message.",
      );

      error.statusCode = response.status;
      throw error;
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }

      if (Date.now() < deadline) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      const timeoutError = new Error(
        "The wellbeing assistant is temporarily unavailable. Please try again shortly.",
      );
      timeoutError.statusCode = 503;
      throw timeoutError;
    } finally {
      clearTimeout(timeout);
    }
  }
}

exports.chat = async (req, res) => {
  const message =
    typeof req.body?.message === "string" ? req.body.message.trim() : "";

  if (!message) {
    return res.status(400).json({
      success: false,
      message: "Message is required.",
    });
  }

  if (message.length > 4000) {
    return res.status(422).json({
      success: false,
      message: "Message is too long.",
    });
  }

  try {
    const data = await requestModalChat({
      userId: req.user._id,
      message,
    });

    return res.status(200).json({
      success: true,
      response: data.response,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    if (statusCode === 401) {
      console.error(
        `Chatbot API auth failure (status 401) — check MODAL_CHATBOT_API_KEY`,
      );
    } else if (statusCode !== 503) {
      console.error(`Chatbot request failed with status ${statusCode}`);
    }

    return res.status(statusCode).json({
      success: false,
      code:
        statusCode === 503
          ? "CHATBOT_TEMPORARILY_UNAVAILABLE"
          : "CHATBOT_REQUEST_FAILED",
      message:
        statusCode === 503
          ? "The wellbeing assistant is temporarily unavailable. Please try again shortly."
          : "The wellbeing assistant could not process your message.",
    });
  }
};
