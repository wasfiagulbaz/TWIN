import time
import hashlib
import json


# How long a cached search result stays valid.
CACHE_TTL_SECONDS = 60 * 60  # 1 hour

_cache = {}


# Fields that actually affect the search query and match results.
# Sourcing preferences (max_buy_price, marketplace) do NOT affect
# what we search for or how matching works, so they're excluded
# from the cache key on purpose.
FINGERPRINT_FIELDS = [
    "brand",
    "title",
    "manufacturer",
    "asin",
    "upc",
    "ean",
    "gtin",
    "model_number",
    "part_number",
    "product_type",
    "size",
    "quantity",
    "pack_count",
    "weight",
    "volume",
    "color",
    "flavor",
    "material",
    "variant",
]


def build_cache_key(product):
    """
    Build a stable cache key from the parts of the product
    fingerprint that actually influence search/matching.
    Ignores unrelated fields like field_confidence, attributes,
    or extra metadata that don't change what we search for.
    """

    relevant = {
        field: product.get(field)
        for field in FINGERPRINT_FIELDS
        if product.get(field)
    }

    serialized = json.dumps(relevant, sort_keys=True)

    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def get_cached_results(product):
    """
    Returns cached (query, results) tuple if a fresh entry
    exists for this product fingerprint, otherwise None.
    """

    key = build_cache_key(product)
    entry = _cache.get(key)

    if not entry:
        return None

    stored_at, query, results = entry

    if time.time() - stored_at > CACHE_TTL_SECONDS:
        # Expired — remove it so the cache doesn't grow forever
        # with stale entries.
        _cache.pop(key, None)
        return None

    return query, results


def store_cached_results(product, query, results):
    key = build_cache_key(product)
    _cache[key] = (time.time(), query, results)


def clear_cache():
    """Useful for testing, or if you ever add a manual refresh button."""
    _cache.clear()