import re
from urllib.parse import urlparse


def extract_asin(amazon_url: str):
    """Extract the ASIN from common Amazon product URL formats."""

    patterns = [
        r"/dp/([A-Z0-9]{10})",
        r"/gp/product/([A-Z0-9]{10})",
        r"/product/([A-Z0-9]{10})",
    ]

    for pattern in patterns:
        match = re.search(pattern, amazon_url, re.IGNORECASE)

        if match:
            return match.group(1).upper()

    return None


def detect_marketplace(amazon_url: str):
    """Detect the Amazon marketplace from the domain."""

    hostname = urlparse(amazon_url).netloc.lower()

    marketplace_domains = {
        "amazon.com": "United States",
        "amazon.co.uk": "United Kingdom",
        "amazon.ca": "Canada",
        "amazon.de": "Germany",
        "amazon.fr": "France",
        "amazon.it": "Italy",
        "amazon.es": "Spain",
        "amazon.com.au": "Australia",
        "amazon.co.jp": "Japan",
        "amazon.in": "India",
        "amazon.com.mx": "Mexico",
        "amazon.nl": "Netherlands",
        "amazon.se": "Sweden",
        "amazon.pl": "Poland",
        "amazon.sg": "Singapore",
        "amazon.ae": "United Arab Emirates",
        "amazon.sa": "Saudi Arabia",
    }

    for domain, marketplace in marketplace_domains.items():
        if hostname == domain or hostname.endswith("." + domain):
            return marketplace

    return "Unknown"


def create_product_fingerprint(
    asin=None,
    title=None,
    brand=None,
    model=None,
    size=None,
    quantity=None,
    color=None,
    upc=None,
    ean=None,
):
    """
    Create a structured identity for the product.

    This will later be used when comparing the Amazon
    product against retailer products.
    """

    return {
        "asin": asin,
        "title": title,
        "brand": brand,
        "model": model,
        "size": size,
        "quantity": quantity,
        "color": color,
        "identifiers": {
            "upc": upc,
            "ean": ean,
        },
    }


def parse_amazon_product(amazon_url: str):

    asin = extract_asin(amazon_url)
    marketplace = detect_marketplace(amazon_url)

    product = create_product_fingerprint(
        asin=asin
    )

    return {
        "amazon_url": amazon_url,
        "marketplace": marketplace,
        "valid_product_url": asin is not None,
        "product": product,
    }