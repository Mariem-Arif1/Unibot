import json
import logging
from dataclasses import dataclass
from typing import Callable, Awaitable

from src.core.config import get_settings
from src.tools.bc_tools import get_bc_tables, select_bc_table
from src.tools.promo_tools import (
    search_items,
    search_customers,
    search_sales_prices,
    search_line_discounts,
    search_campaigns,
)

logger = logging.getLogger(__name__)


@dataclass
class AgentToolset:
    """A named collection of tool definitions and their executor.

    The executor signature is ``(tool_name, args, context)`` where ``context``
    is a dict injected at request time with at least the keys:
      - ``bc_company_name``: BC SQL table prefix for the current user's org
      - ``bc_database_url``:  per-org ODBC string (empty → fall back to env var)
    """
    definitions: list[dict]
    executor: Callable[[str, dict, dict], Awaitable[str]]


# ── Generic BC tool schemas (used as fallback in all BC agents) ───────────────

GET_BC_TABLES_DEF: dict = {
    "name": "get_bc_tables",
    "description": (
        "List tables available in the Business Central database. "
        "Always pass a 'search' keyword (e.g. 'Item', 'Customer', 'Price') to filter results — "
        "the database has thousands of tables and returning all of them will exceed the context limit. "
        "If 'truncated' is true in the result, refine your search term."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "search": {
                "type": "string",
                "description": (
                    "Substring to filter table names by (case-insensitive). "
                    "REQUIRED in practice — omitting it returns up to 150 tables "
                    "but the database may have thousands more. "
                    "Example: 'Item' returns all tables containing 'Item' in their name."
                ),
            },
        },
        "required": [],
    },
}

SELECT_BC_TABLE_DEF: dict = {
    "name": "select_bc_table",
    "description": (
        "Query any Business Central table and return up to 200 rows as JSON. "
        "Use this as a fallback when the domain-specific tools do not cover your query. "
        "Use filters to narrow results and columns to limit which fields are returned."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "table_name": {
                "type": "string",
                "description": "Exact name of the BC table to query (e.g. 'Item', 'Customer').",
            },
            "columns": {
                "type": "array",
                "items": {"type": "string"},
                "description": (
                    "Optional list of column names to return. "
                    "Omit to return all columns."
                ),
            },
            "filters": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "column": {"type": "string", "description": "Column name to filter on."},
                        "op": {
                            "type": "string",
                            "enum": ["=", "!=", ">", ">=", "<", "<=", "LIKE"],
                            "description": "Comparison operator.",
                        },
                        "value": {"description": "Value to compare against."},
                    },
                    "required": ["column", "op", "value"],
                },
                "description": (
                    "Optional list of WHERE conditions. All conditions are ANDed. "
                    "Values are parameterized — never interpolated into SQL."
                ),
            },
        },
        "required": ["table_name"],
    },
}


# ── Promo & Discount domain tool schemas ─────────────────────────────────────

SEARCH_ITEMS_DEF: dict = {
    "name": "search_items",
    "description": (
        "Search the BC Item catalog and return price, cost, and margin data. "
        "Use this to identify products eligible for a promotion and to assess "
        "the financial impact of a proposed discount."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "search": {
                "type": "string",
                "description": "Substring to match against item No. or Description.",
            },
            "category_code": {
                "type": "string",
                "description": "Filter by Item Category Code.",
            },
            "include_blocked": {
                "type": "boolean",
                "description": "Set true to include blocked items. Default: false.",
            },
        },
        "required": [],
    },
}

SEARCH_CUSTOMERS_DEF: dict = {
    "name": "search_customers",
    "description": (
        "Search the BC Customer table to identify promo targets. "
        "Filter by discount group, price group, country, or free-text search."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "search": {
                "type": "string",
                "description": "Substring to match against customer No. or Name.",
            },
            "disc_group": {
                "type": "string",
                "description": "Customer Discount Group code to filter by.",
            },
            "price_group": {
                "type": "string",
                "description": "Customer Price Group code to filter by.",
            },
            "country": {
                "type": "string",
                "description": "Country/Region Code to filter by (e.g. 'FR', 'DE').",
            },
            "include_blocked": {
                "type": "boolean",
                "description": "Set true to include blocked customers. Default: false.",
            },
        },
        "required": [],
    },
}

SEARCH_SALES_PRICES_DEF: dict = {
    "name": "search_sales_prices",
    "description": (
        "Look up special sales price agreements from the BC Sales Price table. "
        "Covers customer-specific and price-group-specific prices. "
        "Use this to understand what prices are already in place before proposing a new promo."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "item_no": {
                "type": "string",
                "description": "Filter by Item No.",
            },
            "sales_type": {
                "type": "string",
                "description": (
                    "Filter by Sales Type. Common values: 'Customer', "
                    "'Customer Price Group', 'All Customers', 'Campaign'."
                ),
            },
            "sales_code": {
                "type": "string",
                "description": (
                    "Filter by Sales Code — the customer No. or price group code "
                    "that the price applies to."
                ),
            },
            "active_on_date": {
                "type": "string",
                "description": (
                    "ISO date string (YYYY-MM-DD). Returns only prices active on that date. "
                    "Use today's date to find currently effective prices."
                ),
            },
        },
        "required": [],
    },
}

SEARCH_LINE_DISCOUNTS_DEF: dict = {
    "name": "search_line_discounts",
    "description": (
        "Look up line discount agreements from the BC Sales Line Discount table. "
        "Use this to understand which customers or groups already receive automatic discounts "
        "on which items or item categories."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "item_no": {
                "type": "string",
                "description": "Filter by item No. (when discount Type = 'Item').",
            },
            "item_disc_group": {
                "type": "string",
                "description": "Filter by Item Discount Group code (when Type = 'Item Disc. Group').",
            },
            "sales_type": {
                "type": "string",
                "description": (
                    "Filter by Sales Type. Common values: 'Customer', "
                    "'Customer Disc. Group', 'All Customers', 'Campaign'."
                ),
            },
            "sales_code": {
                "type": "string",
                "description": "Filter by Sales Code (customer No. or discount group code).",
            },
            "active_on_date": {
                "type": "string",
                "description": "ISO date (YYYY-MM-DD). Returns only currently active agreements.",
            },
        },
        "required": [],
    },
}

SEARCH_CAMPAIGNS_DEF: dict = {
    "name": "search_campaigns",
    "description": (
        "List BC promotional campaigns. Use this to check for existing campaigns "
        "before proposing a new one, and to avoid conflicting promos."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "search": {
                "type": "string",
                "description": "Substring to match against campaign No. or Description.",
            },
            "active_only": {
                "type": "boolean",
                "description": "Set true to return only campaigns currently running. Default: false.",
            },
        },
        "required": [],
    },
}


# ── Executors ─────────────────────────────────────────────────────────────────

async def bc_tool_executor(tool_name: str, args: dict, context: dict) -> str:
    """Dispatch generic BC tool calls.

    Returns a JSON string (list of rows, list of table names, or error dict).
    Never raises — errors are returned as {"error": "..."} so the LLM can handle them.
    ``context`` may carry ``bc_database_url`` from the user's org; falls back to env var.
    """
    conn_str = context.get("bc_database_url") or get_settings().bc_database_url
    try:
        if tool_name == "get_bc_tables":
            result = await get_bc_tables(conn_str, search=args.get("search"))
            return json.dumps(result)
        elif tool_name == "select_bc_table":
            return await select_bc_table(
                conn_str=conn_str,
                table_name=args["table_name"],
                columns=args.get("columns"),
                filters=args.get("filters"),
            )
        else:
            return json.dumps({"error": f"Unknown tool: {tool_name}"})
    except Exception as exc:
        logger.warning("bc_tool_executor.error tool=%s error=%s", tool_name, exc)
        return json.dumps({"error": str(exc)})


async def promo_tool_executor(tool_name: str, args: dict, context: dict) -> str:
    """Dispatch promo/discount domain tool calls.

    Falls through to bc_tool_executor for the two generic BC tools.
    Never raises — errors returned as {"error": "..."}.
    ``context`` carries ``bc_company_name`` and ``bc_database_url`` from the user's org.
    """
    settings = get_settings()
    conn_str = context.get("bc_database_url") or settings.bc_database_url
    company = context.get("bc_company_name") or settings.bc_company_name

    try:
        if tool_name == "search_items":
            return await search_items(
                conn_str=conn_str,
                company=company,
                search=args.get("search"),
                category_code=args.get("category_code"),
                include_blocked=args.get("include_blocked", False),
            )
        elif tool_name == "search_customers":
            return await search_customers(
                conn_str=conn_str,
                company=company,
                disc_group=args.get("disc_group"),
                price_group=args.get("price_group"),
                country=args.get("country"),
                search=args.get("search"),
                include_blocked=args.get("include_blocked", False),
            )
        elif tool_name == "search_sales_prices":
            return await search_sales_prices(
                conn_str=conn_str,
                company=company,
                item_no=args.get("item_no"),
                sales_type=args.get("sales_type"),
                sales_code=args.get("sales_code"),
                active_on_date=args.get("active_on_date"),
            )
        elif tool_name == "search_line_discounts":
            return await search_line_discounts(
                conn_str=conn_str,
                company=company,
                item_no=args.get("item_no"),
                item_disc_group=args.get("item_disc_group"),
                sales_type=args.get("sales_type"),
                sales_code=args.get("sales_code"),
                active_on_date=args.get("active_on_date"),
            )
        elif tool_name == "search_campaigns":
            return await search_campaigns(
                conn_str=conn_str,
                company=company,
                active_only=args.get("active_only", False),
                search=args.get("search"),
            )
        else:
            # Fall back to generic BC tools
            return await bc_tool_executor(tool_name, args, context)
    except Exception as exc:
        logger.warning("promo_tool_executor.error tool=%s error=%s", tool_name, exc)
        return json.dumps({"error": str(exc)})


# ── Registry ──────────────────────────────────────────────────────────────────

AGENT_TOOLS: dict[str, AgentToolset] = {
    "promo_discount": AgentToolset(
        definitions=[
            # Domain-specific promo tools (primary)
            SEARCH_ITEMS_DEF,
            SEARCH_CUSTOMERS_DEF,
            SEARCH_SALES_PRICES_DEF,
            SEARCH_LINE_DISCOUNTS_DEF,
            SEARCH_CAMPAIGNS_DEF,
            # Generic BC tools (fallback for ad-hoc queries)
            GET_BC_TABLES_DEF,
            SELECT_BC_TABLE_DEF,
        ],
        executor=promo_tool_executor,
    ),
}
