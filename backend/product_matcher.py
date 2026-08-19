import os
import re
import json

from dotenv import load_dotenv
from google import genai
from google.genai import types

from gemini_utils import call_with_retry


load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=GEMINI_API_KEY)


# ============================================================
# Helpers (reused from the original rule-based matcher)
# ============================================================

def normalize_text(value):
    if not value:
        return ""

    value = str(value).lower()
    value = re.sub(r"[^a-z0-9.]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip()

    return value


def extract_ounces(text):
    if not text:
        return []

    text = normalize_text(text)

    matches = re.findall(
        r"(\d+(?:\.\d+)?)\s*(?:oz|ounce|ounces)",
        text
    )

    return [float(value) for value in matches]


def contains_value(text, value):
    if not value:
        return False

    return normalize_text(value) in normalize_text(text)


# ============================================================
# STEP 1 — Cheap rule-based pre-filter (no API cost)
#
# Goal: only remove candidates that are CLEARLY wrong so we
# don't waste an LLM call on them. This is intentionally
# conservative — when in doubt, keep the candidate and let
# the LLM decide.
# ============================================================

def is_obviously_wrong(product, result):
    searchable_text = f"{result.get('title', '')} {result.get('snippet', '')}"

    # Brand check: if the product has a brand and it doesn't
    # appear at all in the candidate text, that's a strong signal.
    brand = product.get("brand")
    if brand and not contains_value(searchable_text, brand):
        return True

    # Size check: if both sides have a size and they're wildly
    # different (more than ~2.5x off in either direction), drop it.
    product_size = product.get("size")
    product_weight = product.get("weight")

    expected_ounces = extract_ounces(
        f"{product_size or ''} {product_weight or ''}"
    )
    result_ounces = extract_ounces(searchable_text)

    if expected_ounces and result_ounces:
        expected = expected_ounces[0]

        close_enough = any(
            (value / expected) if expected else 0
            and 0.4 <= (value / expected) <= 2.5
            for value in result_ounces
        )

        if not close_enough:
            return True

    return False


# ============================================================
# STEP 2 — Rule-based fallback (original logic)
# Used only if the Gemini call fails.
# ============================================================

def _rule_based_match(product, result):
    title = result.get("title") or ""
    snippet = result.get("snippet") or ""

    searchable_text = f"{title} {snippet}"

    score = 0
    checks = {}

    brand = product.get("brand")
    if brand:
        brand_match = contains_value(searchable_text, brand)
        checks["brand"] = brand_match
        if brand_match:
            score += 25

    product_title = product.get("title")
    if product_title:
        title_words = [
            word for word in normalize_text(product_title).split()
            if len(word) > 2
        ]

        if title_words:
            matched_words = sum(
                1 for word in title_words
                if word in normalize_text(searchable_text)
            )
            title_ratio = matched_words / len(title_words)
            checks["title_match"] = title_ratio >= 0.6
            score += title_ratio * 30

    product_type = product.get("product_type")
    if product_type:
        type_match = contains_value(searchable_text, product_type)
        checks["product_type"] = type_match
        if type_match:
            score += 15

    product_size = product.get("size")
    product_weight = product.get("weight")
    expected_ounces = extract_ounces(f"{product_size or ''} {product_weight or ''}")
    result_ounces = extract_ounces(searchable_text)

    if expected_ounces:
        expected = expected_ounces[0]
        exact_size_match = any(abs(value - expected) < 0.01 for value in result_ounces)
        checks["size_match"] = exact_size_match

        if exact_size_match:
            score += 20
        elif result_ounces:
            score -= 15

    flavor = product.get("flavor")
    if flavor:
        flavor_match = contains_value(searchable_text, flavor)
        checks["flavor_match"] = flavor_match
        if flavor_match:
            score += 10

    score = max(0, min(100, round(score)))

    if score >= 85:
        match_level = "strong"
    elif score >= 65:
        match_level = "possible"
    else:
        match_level = "weak"

    return {
        "match_score": score,
        "match_level": match_level,
        "checks": checks
    }


# ============================================================
# STEP 3 — LLM-based matching (the real intelligence)
# ============================================================

MATCH_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "index": {"type": "integer"},
            "match_score": {"type": "integer"},
            "match_level": {
                "type": "string",
                "enum": ["strong", "possible", "weak"]
            },
            "checks": {
                "type": "object",
                "properties": {
                    "brand": {"type": "boolean"},
                    "title_match": {"type": "boolean"},
                    "product_type": {"type": "boolean"},
                    "size_match": {"type": "boolean"},
                    "flavor_match": {"type": "boolean"}
                },
                "required": [
                    "brand",
                    "title_match",
                    "product_type",
                    "size_match",
                    "flavor_match"
                ]
            }
        },
        "required": ["index", "match_score", "match_level", "checks"]
    }
}


def build_matching_prompt(product, candidates):
    fingerprint_lines = []

    for field in [
        "brand", "title", "product_type", "size",
        "weight", "flavor", "variant", "upc", "asin", "gtin"
    ]:
        value = product.get(field)
        if value:
            fingerprint_lines.append(f"{field}: {value}")

    fingerprint_text = "\n".join(fingerprint_lines)

    candidate_lines = []

    for i, candidate in enumerate(candidates):
        candidate_lines.append(
            f"[{i}] TITLE: {candidate.get('title', '')}\n"
            f"    SNIPPET: {candidate.get('snippet', '')}"
        )

    candidates_text = "\n\n".join(candidate_lines)

    prompt = f"""
You are a product matching system for an e-commerce sourcing tool.

You are given ONE reference product (extracted from an Amazon
listing) and a list of CANDIDATE products found on the web via
search. Your job is to determine, for EACH candidate, how likely
it is to be the SAME real-world product as the reference — not
just a similar or related product.

REFERENCE PRODUCT:
{fingerprint_text}

CANDIDATES:
{candidates_text}

MATCHING RULES:

1. Judge whether the candidate is the SAME product, considering
   that wording, word order, and phrasing may differ even when
   the product is identical (e.g. "Ground Coffee, Gourmet
   Supreme" vs "Gourmet Supreme Ground Coffee" is the SAME).

2. Size/weight mismatches are important. A meaningfully different
   size (e.g. 24.2 oz vs 30.5 oz) usually means it is NOT the same
   product, even if everything else matches.

3. A different flavor/variant (e.g. "Classic Roast" vs "Gourmet
   Supreme") usually means it is NOT the same product.

4. Missing information in the candidate is not automatically a
   failure — only mark a check false if there's a clear conflict,
   or if the reference has that field and the candidate text gives
   no reasonable support for it.

5. For EACH candidate, return:
   - index (matching the candidate's bracket number above)
   - match_score: 0-100, how confident you are this is the same
     product
   - match_level: "strong" (85+), "possible" (65-84), or "weak"
     (below 65) — must be consistent with match_score
   - checks: boolean true/false for brand, title_match,
     product_type, size_match, flavor_match — true means that
     aspect supports a match, false means it conflicts or is
     clearly absent when the reference specifies it

Return a JSON array with exactly one entry per candidate, in any
order, using the index field to identify which candidate each
entry refers to.
"""

    return prompt


def llm_match_candidates(product, candidates):
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    if not candidates:
        return {}

    prompt = build_matching_prompt(product, candidates)

    def make_request():
        return client.models.generate_content(
            model="gemini-3.6-flash",
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=MATCH_SCHEMA,
                temperature=0
            )
        )

    response = call_with_retry(make_request)

    parsed = json.loads(response.text)

    results_by_index = {}

    for item in parsed:
        index = item.get("index")

        if index is None:
            continue

        results_by_index[index] = {
            "match_score": max(0, min(100, int(item.get("match_score", 0)))),
            "match_level": item.get("match_level", "weak"),
            "checks": item.get("checks", {})
        }

    return results_by_index


# ============================================================
# Public entry point — same signature/output shape as before
# ============================================================

def match_products(product, search_results):
    """
    Match all search results against the Amazon product.
    Uses a cheap rule-based pre-filter, then an LLM call for
    the survivors. Falls back to rule-based scoring if the
    LLM call fails for any reason.
    """

    # Split into "keep" (send to LLM) vs "obviously wrong" (skip LLM, score 0)
    candidates_to_judge = []
    dropped_results = []

    for result in search_results:
        if is_obviously_wrong(product, result):
            dropped_results.append({
                **result,
                "match_score": 0,
                "match_level": "weak",
                "checks": {}
            })
        else:
            candidates_to_judge.append(result)

    matched_results = list(dropped_results)

    if candidates_to_judge:
        try:
            llm_results = llm_match_candidates(product, candidates_to_judge)

            for i, result in enumerate(candidates_to_judge):
                match = llm_results.get(i)

                if match is None:
                    # LLM didn't return this one — fall back for just this item
                    match = _rule_based_match(product, result)

                matched_results.append({**result, **match})

        except Exception:
            # Whole LLM call failed — fall back to rule-based for all of them
            for result in candidates_to_judge:
                match = _rule_based_match(product, result)
                matched_results.append({**result, **match})

    matched_results.sort(key=lambda item: item["match_score"], reverse=True)

    return matched_results


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    test_product = {
        "brand": "Folgers",
        "title": "Folgers Gourmet Supreme Ground Coffee",
        "product_type": "Ground Coffee",
        "size": "24.2 Ounce",
        "weight": "24.2 oz",
        "flavor": "Gourmet Supreme"
    }

    test_results = [
        {
            "title": "Folgers Gourmet Supreme Ground Coffee, 24.2 oz. Canisters",
            "url": "https://example.com/24.2",
            "snippet": "Folgers Gourmet Supreme Ground Coffee - 24.2 oz.",
            "score": 0.88
        },
        {
            "title": "Folgers Gourmet Supreme Ground Coffee - 22.6 oz",
            "url": "https://example.com/22.6",
            "snippet": "Folgers Gourmet Supreme Medium Dark Roast Ground Coffee 22.6 oz.",
            "score": 0.80
        },
        {
            "title": "Random Coffee Product",
            "url": "https://example.com/random",
            "snippet": "Premium coffee beans.",
            "score": 0.40
        }
    ]

    results = match_products(test_product, test_results)

    for result in results:
        print("\n--------------------------------")
        print("TITLE:", result["title"])
        print("MATCH SCORE:", result["match_score"])
        print("MATCH LEVEL:", result["match_level"])
        print("CHECKS:")
        for key, value in result.get("checks", {}).items():
            print(f"  {key}: {value}")