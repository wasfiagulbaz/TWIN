import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

from auth import (
    assert_search_allowed,
    get_current_user_id,
    get_user_profile,
    increment_search_count,
)
from billing import router as billing_router
from product_parser import parse_amazon_product
from ai_extractor import extract_product_from_images

from search_engine import search_products
from product_matcher import match_products
from search_cache import get_cached_results, store_cached_results

_root_env = Path(__file__).resolve().parent.parent / ".env"
_backend_env = Path(__file__).resolve().parent / ".env"
load_dotenv(_root_env)
load_dotenv(_backend_env)

app = FastAPI(
    title="Amazon Sourcing Assistant",
    description="Backend for the Amazon product sourcing platform",
    version="1.0.0"
)


# Allow our React frontend to communicate with FastAPI
_cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
_frontend_url = os.getenv("FRONTEND_URL")
if _frontend_url and _frontend_url not in _cors_origins:
    _cors_origins.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(billing_router)


class SourcingRequest(BaseModel):
    amazon_url: str
    max_buy_price: float
    marketplace: str

class ProductSearchRequest(BaseModel):
    product: dict
    max_buy_price: float | None = None
    marketplace: str | None = None

@app.get("/")
def home():
    return {
        "status": "online",
        "message": "Amazon Sourcing Assistant API is running"
    }


@app.post("/source")
def source_product(request: SourcingRequest):
    return {
        "status": "success",
        "message": "Sourcing request received",
        "amazon_url": request.amazon_url,
        "max_buy_price": request.max_buy_price,
        "marketplace": request.marketplace
    }


@app.post("/product/parse")
def parse_product(request: SourcingRequest):

    product = parse_amazon_product(request.amazon_url)

    return {
        "status": "success",
        "product": product
    }


@app.post("/product/analyze")
async def analyze_product(
    images: List[UploadFile] = File(...)
):
    """
    Receive product screenshots and send them
    to the AI extraction service.
    """

    image_files = []

    for image in images:

        if not image.content_type:
            continue

        if not image.content_type.startswith("image/"):
            continue

        image_data = await image.read()

        image_files.append({
            "filename": image.filename,
            "content_type": image.content_type,
            "data": image_data
        })

    if not image_files:
        return {
            "status": "error",
            "message": "No valid images were uploaded."
        }

    result = extract_product_from_images(image_files)

    return {
        "status": "success",
        "images_received": len(image_files),
        "result": result
    }

@app.post("/product/analyze-test")
async def analyze_product_test(
    image: UploadFile = File(...)
):
    """
    Temporary endpoint for testing image uploads through Swagger.
    """

    if not image.content_type:
        return {
            "status": "error",
            "message": "No content type detected."
        }

    if not image.content_type.startswith("image/"):
        return {
            "status": "error",
            "message": "Uploaded file is not an image."
        }

    image_data = await image.read()

    result = extract_product_from_images([
        {
            "filename": image.filename,
            "content_type": image.content_type,
            "data": image_data
        }
    ])

    return {
        "status": "success",
        "filename": image.filename,
        "content_type": image.content_type,
        "image_size_bytes": len(image_data),
        "result": result
    }

@app.post("/product/search")
def search_product(
    request: ProductSearchRequest,
    user_id: str = Depends(get_current_user_id),
):
    profile = get_user_profile(user_id)
    assert_search_allowed(profile)

    product = request.product

    cached = get_cached_results(product)

    if cached:
        query, matched_results = cached

        increment_search_count(user_id, profile.get("search_count", 0))

        return {
            "status": "success",
            "query": query,
            "max_buy_price": request.max_buy_price,
            "marketplace": request.marketplace,
            "results": matched_results,
            "from_cache": True,
            "search_count": profile.get("search_count", 0) + 1,
        }

    search_data = search_products(product)

    matched_results = match_products(
        product,
        search_data["results"]
    )

    store_cached_results(
        product,
        search_data["query"],
        matched_results
    )

    increment_search_count(user_id, profile.get("search_count", 0))

    return {
        "status": "success",
        "query": search_data["query"],
        "max_buy_price": request.max_buy_price,
        "marketplace": request.marketplace,
        "results": matched_results,
        "from_cache": False,
        "search_count": profile.get("search_count", 0) + 1,
    }