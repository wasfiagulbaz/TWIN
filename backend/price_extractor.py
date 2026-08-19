import re
import requests
from bs4 import BeautifulSoup


PRICE_PATTERNS = [
    r"\$\s?(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)",
]


def extract_price_from_page(url):
    """
    Extract a clearly visible USD price from a product page.

    Returns:
        {
            "price": float | None,
            "currency": "USD" | None,
            "status": "found" | "not_found" | "blocked"
        }
    """

    try:
        response = requests.get(
            url,
            timeout=10,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 "
                    "(KHTML, like Gecko) "
                    "Chrome/142.0 Safari/537.36"
                )
            },
        )

        if response.status_code in [401, 403]:
            return {
                "price": None,
                "currency": None,
                "status": "blocked"
            }

        if response.status_code != 200:
            return {
                "price": None,
                "currency": None,
                "status": "not_found"
            }

        soup = BeautifulSoup(
            response.text,
            "html.parser"
        )

        # Remove scripts/styles to avoid extracting
        # prices hidden inside JavaScript or CSS.
        for element in soup(
            ["script", "style", "noscript"]
        ):
            element.decompose()

        page_text = soup.get_text(
            " ",
            strip=True
        )

        prices = []

        for pattern in PRICE_PATTERNS:
            matches = re.findall(
                pattern,
                page_text
            )

            for match in matches:
                try:
                    value = float(
                        match.replace(",", "")
                    )

                    if value > 0:
                        prices.append(value)

                except ValueError:
                    continue

        if not prices:
            return {
                "price": None,
                "currency": None,
                "status": "not_found"
            }

        # For now, use the first clearly detected price.
        price = prices[0]

        return {
            "price": price,
            "currency": "USD",
            "status": "found"
        }

    except requests.RequestException:
        return {
            "price": None,
            "currency": None,
            "status": "not_found"
        }

    except Exception:
        return {
            "price": None,
            "currency": None,
            "status": "not_found"
        }