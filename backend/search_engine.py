import os
import re
import requests
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(ENV_FILE)

SERPER_API_KEY = os.getenv("SERPER_API_KEY")

EXCLUDED_DOMAINS = [
    "amazon.com", "www.amazon.com", 
    "reddit.com", "youtube.com", 
    "facebook.com", "instagram.com", 
    "pinterest.com", "tiktok.com"
]


def extract_price(text_or_val):
    """Converts raw price strings or numbers into a clean float."""
    if text_or_val is None:
        return None
    if isinstance(text_or_val, (int, float)):
        return float(text_or_val)

    match = re.search(r'\$\s?(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)', str(text_or_val))
    if match:
        return float(match.group(1).replace(",", ""))
    
    match_digits = re.search(r'(\d+(?:\.\d{2})?)', str(text_or_val))
    if match_digits:
        return float(match_digits.group(1))

    return None


def calculate_profit_metrics(supplier_price, amazon_price):
    """Calculates estimated profit, margin percentage, and ROI."""
    if not supplier_price or not amazon_price or amazon_price <= 0:
        return {
            "estimated_profit": None,
            "profit_margin_pct": None,
            "roi_pct": None
        }

    profit = round(amazon_price - supplier_price, 2)
    margin_pct = round((profit / amazon_price) * 100, 2)
    roi_pct = round((profit / supplier_price) * 100, 2) if supplier_price > 0 else 0.0

    return {
        "estimated_profit": profit,
        "profit_margin_pct": margin_pct,
        "roi_pct": roi_pct
    }


def build_search_queries(product):
    """Builds clean search queries from the fingerprint while excluding Amazon."""
    brand = product.get("brand")
    title = product.get("title")
    product_type = product.get("product_type")
    size = product.get("size")
    flavor = product.get("flavor")

    queries = []

    if title:
        clean_title = title.replace("Amazon", "").replace("amazon", "").strip()
        queries.append(f"{clean_title} -site:amazon.com")

    parts_title_size = [p for p in [brand, title, size] if p]
    if parts_title_size:
        q = " ".join(parts_title_size).replace("Amazon", "").replace("amazon", "").strip()
        queries.append(f"{q} -site:amazon.com")

    parts_type_flavor = [p for p in [brand, product_type, flavor, size] if p]
    if parts_type_flavor:
        q = " ".join(parts_type_flavor).strip()
        queries.append(f"{q} -site:amazon.com")

    seen = set()
    unique_queries = []
    for query in queries:
        normalized = query.strip().lower()
        if normalized and normalized not in seen:
            seen.add(normalized)
            unique_queries.append(query)

    return unique_queries


def search_products(product, max_results_per_query=10, max_total_results=20, sort_by_price=True, hide_missing_prices=True):
    """
    Searches Google Shopping & Organic Search via Serper API.
    Calculates margins against amazon_price and sorts by best price.
    """
    if not SERPER_API_KEY:
        raise ValueError("SERPER_API_KEY is missing in your .env file.")

    amazon_price = extract_price(product.get("amazon_price") or product.get("price"))
    queries = build_search_queries(product)
    if not queries:
        return {"query": "", "results": []}

    seen_urls = set()
    combined_results = []

    headers = {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json"
    }

    for query in queries:
        # 1. Google Shopping Search
        try:
            shopping_resp = requests.post(
                "https://google.serper.dev/shopping",
                headers=headers,
                json={"q": query, "num": max_results_per_query},
                timeout=8
            )
            if shopping_resp.status_code == 200:
                data = shopping_resp.json()
                for item in data.get("shopping", []):
                    url = item.get("link")
                    if not url or url in seen_urls or any(d in url for d in EXCLUDED_DOMAINS):
                        continue

                    seen_urls.add(url)
                    supplier_price = extract_price(item.get("price"))
                    store_name = item.get("source", "Retailer")
                    metrics = calculate_profit_metrics(supplier_price, amazon_price)

                    combined_results.append({
                        "title": f"[{store_name}] {item.get('title', '')}",
                        "url": url,
                        "store_name": store_name,
                        "snippet": f"Store: {store_name} | Price: {item.get('price', 'N/A')} | Rating: {item.get('rating', 'N/A')}",
                        "score": 1.0,
                        "price": supplier_price,
                        "amazon_price": amazon_price,
                        "estimated_profit": metrics["estimated_profit"],
                        "profit_margin_pct": metrics["profit_margin_pct"],
                        "roi_pct": metrics["roi_pct"],
                        "matched_query": query,
                    })
        except Exception as e:
            print(f"Serper Shopping API error: {e}")

        # 2. Google Organic Search Fallback
        try:
            organic_resp = requests.post(
                "https://google.serper.dev/search",
                headers=headers,
                json={"q": query, "num": max_results_per_query},
                timeout=8
            )
            if organic_resp.status_code == 200:
                data = organic_resp.json()
                for item in data.get("organic", []):
                    url = item.get("link")
                    if not url or url in seen_urls or any(d in url for d in EXCLUDED_DOMAINS):
                        continue

                    seen_urls.add(url)
                    snippet = item.get("snippet", "")
                    supplier_price = extract_price(snippet)
                    metrics = calculate_profit_metrics(supplier_price, amazon_price)

                    combined_results.append({
                        "title": item.get("title", ""),
                        "url": url,
                        "store_name": "Web Result",
                        "snippet": snippet,
                        "score": 0.8,
                        "price": supplier_price,
                        "amazon_price": amazon_price,
                        "estimated_profit": metrics["estimated_profit"],
                        "profit_margin_pct": metrics["profit_margin_pct"],
                        "roi_pct": metrics["roi_pct"],
                        "matched_query": query,
                    })
        except Exception as e:
            print(f"Serper Organic API error: {e}")

        if len(combined_results) >= max_total_results:
            break

    # Filtering missing prices
    if hide_missing_prices:
        combined_results = [r for r in combined_results if r["price"] is not None]

    # Sorting by lowest supplier price first
    if sort_by_price:
        combined_results = sorted(
            combined_results,
            key=lambda x: (x["price"] is None, x["price"])
        )

    return {
        "query": " | ".join(queries),
        "results": combined_results[:max_total_results]
    }


if __name__ == "__main__":
    test_product = {
        "brand": "Folgers",
        "title": "Folgers Gourmet Supreme Ground Coffee",
        "product_type": "Ground Coffee",
        "size": "24.2 Ounce",
        "flavor": "Gourmet Supreme",
        "amazon_price": 24.99  # Example Amazon listing selling price
    }

    result = search_products(test_product)

    print("\nAMAZON TARGET PRICE: $24.99")
    print(f"TOTAL SOURCED RESULTS: {len(result['results'])}\n")

    for item in result["results"]:
        print(f"STORE: {item['store_name']}")
        print(f"SUPPLIER PRICE: ${item['price']}")
        print(f"ESTIMATED PROFIT: ${item['estimated_profit']}")
        print(f"MARGIN: {item['profit_margin_pct']}% | ROI: {item['roi_pct']}%")
        print(f"URL: {item['url']}\n" + "-"*50)