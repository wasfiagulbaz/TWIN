import os
import json

from dotenv import load_dotenv
from google import genai
from google.genai import types

from gemini_utils import call_with_retry


load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=GEMINI_API_KEY)


PRODUCT_SCHEMA = {
    "type": "object",
    "properties": {

        "title": {
            "type": "string",
            "nullable": True
        },

        "brand": {
            "type": "string",
            "nullable": True
        },

        "manufacturer": {
            "type": "string",
            "nullable": True
        },

        "asin": {
            "type": "string",
            "nullable": True
        },

        "upc": {
            "type": "string",
            "nullable": True
        },

        "ean": {
            "type": "string",
            "nullable": True
        },

        "gtin": {
            "type": "string",
            "nullable": True
        },

        "model_number": {
            "type": "string",
            "nullable": True
        },

        "part_number": {
            "type": "string",
            "nullable": True
        },

        "category": {
            "type": "string",
            "nullable": True
        },

        "product_type": {
            "type": "string",
            "nullable": True
        },

        "size": {
            "type": "string",
            "nullable": True
        },

        "quantity": {
            "type": "string",
            "nullable": True
        },

        "pack_count": {
            "type": "string",
            "nullable": True
        },

        "weight": {
            "type": "string",
            "nullable": True
        },

        "dimensions": {
            "type": "string",
            "nullable": True
        },

        "volume": {
            "type": "string",
            "nullable": True
        },

        "color": {
            "type": "string",
            "nullable": True
        },

        "flavor": {
            "type": "string",
            "nullable": True
        },

        "material": {
            "type": "string",
            "nullable": True
        },

        "variant": {
            "type": "string",
            "nullable": True
        },

        "attributes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string"
                    },
                    "value": {
                        "type": "string"
                    },
                    "confidence": {
                        "type": "number"
                    }
                },
                "required": [
                    "name",
                    "value",
                    "confidence"
                ]
            }
        },

        "field_confidence": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "field": {
                        "type": "string"
                    },
                    "confidence": {
                        "type": "number"
                    },
                    "evidence": {
                        "type": "string"
                    }
                },
                "required": [
                    "field",
                    "confidence",
                    "evidence"
                ]
            }
        }
    },

    "required": [
        "title",
        "brand",
        "manufacturer",
        "asin",
        "upc",
        "ean",
        "gtin",
        "model_number",
        "part_number",
        "category",
        "product_type",
        "size",
        "quantity",
        "pack_count",
        "weight",
        "dimensions",
        "volume",
        "color",
        "flavor",
        "material",
        "variant",
        "attributes",
        "field_confidence"
    ]
}


def extract_product_from_images(image_files):

    if not GEMINI_API_KEY:

        return {
            "status": "error",
            "message": "GEMINI_API_KEY is not configured."
        }

    prompt = """
You are a professional product information extraction system.

The user has provided one or more screenshots of THE SAME
Amazon product.

Analyze ALL screenshots together.

Your task is to create ONE unified product fingerprint.

IMPORTANT EXTRACTION RULES:

1. Extract information only when it is visible or clearly readable.

2. NEVER guess missing information.

3. If a field is not visible, return null.

4. Combine information from all screenshots.

5. If the same field appears in multiple screenshots and the
   information agrees, use the agreed value.

6. If different screenshots contain conflicting information,
   use the value that is best supported by the visible evidence.

7. If a value is difficult to read, partially visible, unclear,
   or could reasonably have multiple interpretations, lower
   its confidence score.

8. Do not invent product information.

9. Preserve ASIN, UPC, EAN, GTIN, model numbers, part numbers,
   measurements and other identifiers exactly as visible.

10. Ignore advertisements, recommendations, navigation,
    unrelated products and unrelated page content.

11. Product-specific information that does not fit the core
    fields should be placed in "attributes".

For EVERY core product field, create exactly one entry inside
"field_confidence".

Each entry must contain:

- field
- confidence
- evidence

The "field" value must exactly match the product field name.

The confidence value must be between 0 and 1.

The evidence field must briefly describe the visible evidence
that supports the extracted value.

IMPORTANT:

Evidence must be based ONLY on what is visible in the provided
screenshots.

Do NOT use outside product knowledge as evidence.

If the field is clearly visible, provide a short description of
where/how it appears.

If the field is missing, use:

confidence: 0
evidence: ""

If the field is difficult to read, partially visible, or
ambiguous, describe the uncertainty in the evidence.

Examples:

Clearly visible:

{
    "field": "brand",
    "confidence": 1.0,
    "evidence": "The product information area clearly shows 'Folgers'."
}

Clearly visible identifier:

{
    "field": "asin",
    "confidence": 1.0,
    "evidence": "The ASIN is clearly displayed as B010ULFIBE."
}

Missing:

{
    "field": "upc",
    "confidence": 0,
    "evidence": ""
}

Ambiguous:

{
    "field": "weight",
    "confidence": 0.65,
    "evidence": "The screenshot shows 24.2 oz, but the surrounding
    information appears to describe package size rather than a
    separately labeled weight field."
}

The evidence is INTERNAL information.

Do not put evidence or confidence explanations into the normal
product fields.


The frontend will use these confidence values to visually
highlight fields that require user attention.

Do NOT write explanations into the normal product fields.

Return only the structured JSON requested by the schema.
"""

    contents = [prompt]

    for image in image_files:

        image_part = types.Part.from_bytes(
            data=image["data"],
            mime_type=image["content_type"]
        )

        contents.append(image_part)

    try:

        def make_request():
            return client.models.generate_content(

                model="gemini-3.6-flash",

                contents=contents,

                config=types.GenerateContentConfig(

                    response_mime_type="application/json",

                    response_schema=PRODUCT_SCHEMA,

                    temperature=0
                )
            )

        response = call_with_retry(make_request)

        product = json.loads(response.text)

        return {
            "status": "success",
            "product": product
        }

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }