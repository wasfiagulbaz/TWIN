import time
import random


# Errors that are worth retrying — transient/overload issues, not
# things like bad API keys or invalid requests.
RETRYABLE_MARKERS = [
    "503",
    "UNAVAILABLE",
    "429",
    "RESOURCE_EXHAUSTED",
    "overloaded",
    "high demand",
]


def is_retryable_error(error):
    message = str(error)
    return any(marker in message for marker in RETRYABLE_MARKERS)


def call_with_retry(fn, max_attempts=3, base_delay=1.5):
    """
    Calls fn() and retries on transient Gemini errors
    (503 overloaded, 429 rate limited, etc.) with
    exponential backoff + jitter.

    Raises the last error if all attempts fail.
    """

    last_error = None

    for attempt in range(1, max_attempts + 1):
        try:
            return fn()

        except Exception as error:
            last_error = error

            if not is_retryable_error(error):
                raise

            if attempt == max_attempts:
                raise

            delay = base_delay * (2 ** (attempt - 1))
            delay += random.uniform(0, 0.5)

            time.sleep(delay)

    raise last_error