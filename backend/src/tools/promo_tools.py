"""Domain-specific tools for the Promo & Discount agent.

These tools know the BC table structure for pricing and discounts, so the LLM
does not need to discover tables manually for common promo workflows.

BC SQL Server naming: tables are "{CompanyName}${TableName}" when a company
prefix is configured (BC_COMPANY_NAME env var).  If the env var is empty the
bare table name is used (single-company or view-based setups).
"""

import json
import logging
from typing import Optional

from src.tools.bc_connection import open_bc_connection

logger = logging.getLogger(__name__)

_MAX_ROWS = 150


# ── Helpers ───────────────────────────────────────────────────────────────────


def _tbl(company: str, base: str) -> str:
    """Return the bracketed SQL table name, with company prefix when set."""
    if company:
        return f"[{company}${base}]"
    return f"[{base}]"


async def _find_table(conn, company: str, base_name: str) -> str:
    """Find the actual SQL table name in INFORMATION_SCHEMA.

    Tries the configured name first; falls back to a LIKE search so the tool
    works even if the company prefix in BC_COMPANY_NAME is slightly off.

    Returns the bracketed table name ready for use in a FROM clause.
    Raises RuntimeError if no match is found.
    """
    preferred = f"{company}${base_name}" if company else base_name
    cursor = await conn.cursor()

    # Exact match or suffix match — fastest path
    await cursor.execute(
        "SELECT TOP 1 TABLE_NAME FROM INFORMATION_SCHEMA.TABLES "
        "WHERE TABLE_TYPE = 'BASE TABLE' "
        "AND (TABLE_NAME = ? OR TABLE_NAME LIKE ?) "
        "ORDER BY LEN(TABLE_NAME)",
        (preferred, f"%${base_name}"),
    )
    row = await cursor.fetchone()
    if row:
        return f"[{row[0]}]"

    raise RuntimeError(
        f"Table '{base_name}' not found in BC database "
        f"(tried '{preferred}'). "
        f"Use get_bc_tables with search='{base_name}' to discover the exact name."
    )


def _where(conditions: list[tuple]) -> tuple[str, list]:
    """Build a parameterised WHERE clause from (col, op, value) tuples."""
    if not conditions:
        return "", []
    parts = [f"[{col}] {op} ?" for col, op, _ in conditions]
    params = [val for _, _, val in conditions]
    return " WHERE " + " AND ".join(parts), params


# ── Tool functions ─────────────────────────────────────────────────────────────


async def search_items(
    conn_str: str,
    company: str,
    search: Optional[str] = None,
    category_code: Optional[str] = None,
    include_blocked: bool = False,
) -> str:
    """Search the BC Item table and return price + cost data for promo analysis.

    Args:
        conn_str: ODBC connection string.
        company: BC company name prefix (may be empty).
        search: Optional substring to match against item No. or Description.
        category_code: Filter by Item Category Code.
        include_blocked: Set True to include blocked items (default: exclude).

    Returns:
        JSON array of items with No_, Description, Item_Category_Code,
        Unit_Price, Unit_Cost, and a calculated Margin_Pct.
    """
    conn = await open_bc_connection(conn_str)
    try:
        tbl = await _find_table(conn, company, "Item")
        conditions: list[tuple] = []
        if not include_blocked:
            conditions.append(("Blocked", "=", 0))
        if category_code:
            conditions.append(("Item Category Code", "=", category_code))

        where_str, params = _where(conditions)

        # Search is done with OR across No_ and Description
        search_clause = ""
        if search:
            search_clause = (
                f"{'AND' if where_str else 'WHERE'} "
                f"([No_] LIKE ? OR [Description] LIKE ?)"
            )
            params += [f"%{search}%", f"%{search}%"]

        sql = (
            f"SELECT TOP {_MAX_ROWS} "
            f"[No_], [Description], [Item Category Code], "
            f"[Unit Price], [Unit Cost] "
            f"FROM {tbl}{where_str} {search_clause}"
        )
        cursor = await conn.cursor()
        await cursor.execute(sql, params)
        cols = [d[0] for d in cursor.description]
        rows = await cursor.fetchall()

        result = []
        for row in rows:
            item = dict(zip(cols, row))
            price = float(item.get("Unit Price") or 0)
            cost = float(item.get("Unit Cost") or 0)
            item["Margin_Pct"] = (
                round((price - cost) / price * 100, 2) if price else None
            )
            result.append(item)

        logger.info("promo_tools.search_items rows=%d", len(result))
        return json.dumps(result, default=str)
    finally:
        await conn.close()


async def search_customers(
    conn_str: str,
    company: str,
    disc_group: Optional[str] = None,
    price_group: Optional[str] = None,
    country: Optional[str] = None,
    search: Optional[str] = None,
    include_blocked: bool = False,
) -> str:
    """Search the BC Customer table to identify promo targets.

    Args:
        conn_str: ODBC connection string.
        company: BC company name prefix.
        disc_group: Filter by Customer Disc. Group code.
        price_group: Filter by Customer Price Group code.
        country: Filter by Country/Region Code.
        search: Substring match on customer No. or Name.
        include_blocked: Include blocked customers (default: exclude).

    Returns:
        JSON array of customers with No_, Name, Customer_Price_Group,
        Customer_Disc_Group, Salesperson_Code, Country_Region_Code.
    """
    conn = await open_bc_connection(conn_str)
    try:
        tbl = await _find_table(conn, company, "Customer")
        conditions: list[tuple] = []
        if not include_blocked:
            conditions.append(("Blocked", "=", 0))
        if disc_group:
            conditions.append(("Customer Disc. Group", "=", disc_group))
        if price_group:
            conditions.append(("Customer Price Group", "=", price_group))
        if country:
            conditions.append(("Country/Region Code", "=", country))

        where_str, params = _where(conditions)

        search_clause = ""
        if search:
            search_clause = (
                f"{'AND' if where_str else 'WHERE'} "
                f"([No_] LIKE ? OR [Name] LIKE ?)"
            )
            params += [f"%{search}%", f"%{search}%"]

        sql = (
            f"SELECT TOP {_MAX_ROWS} "
            f"[No_], [Name], [Customer Price Group], "
            f"[Customer Disc_ Group], [Salesperson Code], [Country_Region Code] "
            f"FROM {tbl}{where_str} {search_clause}"
        )
        cursor = await conn.cursor()
        await cursor.execute(sql, params)
        cols = [d[0] for d in cursor.description]
        rows = await cursor.fetchall()
        result = [dict(zip(cols, row)) for row in rows]

        logger.info("promo_tools.search_customers rows=%d", len(result))
        return json.dumps(result, default=str)
    finally:
        await conn.close()


async def search_sales_prices(
    conn_str: str,
    company: str,
    item_no: Optional[str] = None,
    sales_type: Optional[str] = None,
    sales_code: Optional[str] = None,
    active_on_date: Optional[str] = None,
) -> str:
    """Look up special sales prices from BC (Sales Price table).

    Covers customer-specific and price-group-specific price agreements.

    Args:
        conn_str: ODBC connection string.
        company: BC company name prefix.
        item_no: Filter by Item No.
        sales_type: Filter by Sales Type (e.g. 'Customer', 'Customer Price Group',
                    'All Customers', 'Campaign').
        sales_code: Filter by Sales Code (customer No. or price group code).
        active_on_date: ISO date string (YYYY-MM-DD). Returns prices whose
                        Starting Date <= date and Ending Date >= date (or is null).

    Returns:
        JSON array with Item_No, Sales_Type, Sales_Code, Starting_Date,
        Ending_Date, Minimum_Quantity, Unit_Price, Currency_Code.
    """
    conn = await open_bc_connection(conn_str)
    try:
        tbl = await _find_table(conn, company, "Sales Price")
        conditions: list[tuple] = []
        if item_no:
            conditions.append(("Item No_", "=", item_no))
        if sales_type:
            conditions.append(("Sales Type", "=", sales_type))
        if sales_code:
            conditions.append(("Sales Code", "=", sales_code))

        where_str, params = _where(conditions)

        date_clause = ""
        if active_on_date:
            connector = "AND" if where_str else "WHERE"
            date_clause = (
                f" {connector} "
                f"([Starting Date] <= ? OR [Starting Date] IS NULL) "
                f"AND ([Ending Date] >= ? OR [Ending Date] IS NULL)"
            )
            params += [active_on_date, active_on_date]

        sql = (
            f"SELECT TOP {_MAX_ROWS} "
            f"[Item No_], [Sales Type], [Sales Code], "
            f"[Starting Date], [Ending Date], [Minimum Quantity], "
            f"[Unit Price], [Currency Code] "
            f"FROM {tbl}{where_str}{date_clause}"
        )
        cursor = await conn.cursor()
        await cursor.execute(sql, params)
        cols = [d[0] for d in cursor.description]
        rows = await cursor.fetchall()
        result = [dict(zip(cols, row)) for row in rows]

        logger.info("promo_tools.search_sales_prices rows=%d", len(result))
        return json.dumps(result, default=str)
    finally:
        await conn.close()


async def search_line_discounts(
    conn_str: str,
    company: str,
    item_no: Optional[str] = None,
    item_disc_group: Optional[str] = None,
    sales_type: Optional[str] = None,
    sales_code: Optional[str] = None,
    active_on_date: Optional[str] = None,
) -> str:
    """Look up line discount agreements from BC (Sales Line Discount table).

    Args:
        conn_str: ODBC connection string.
        company: BC company name prefix.
        item_no: Filter by item Code (when Type = 'Item').
        item_disc_group: Filter by Item Discount Group code (when Type = 'Item Disc. Group').
        sales_type: Filter by Sales Type (e.g. 'Customer', 'Customer Disc. Group').
        sales_code: Filter by Sales Code (customer No. or discount group code).
        active_on_date: ISO date string; filters to currently active agreements.

    Returns:
        JSON array with Type, Code, Sales_Type, Sales_Code, Starting_Date,
        Ending_Date, Minimum_Quantity, Line_Discount_Pct, Currency_Code.
    """
    conn = await open_bc_connection(conn_str)
    try:
        tbl = await _find_table(conn, company, "Sales Line Discount")
        conditions: list[tuple] = []
        if item_no:
            conditions.append(("Code", "=", item_no))
        if item_disc_group:
            conditions.append(("Code", "=", item_disc_group))
        if sales_type:
            conditions.append(("Sales Type", "=", sales_type))
        if sales_code:
            conditions.append(("Sales Code", "=", sales_code))

        where_str, params = _where(conditions)

        date_clause = ""
        if active_on_date:
            connector = "AND" if where_str else "WHERE"
            date_clause = (
                f" {connector} "
                f"([Starting Date] <= ? OR [Starting Date] IS NULL) "
                f"AND ([Ending Date] >= ? OR [Ending Date] IS NULL)"
            )
            params += [active_on_date, active_on_date]

        sql = (
            f"SELECT TOP {_MAX_ROWS} "
            f"[Type], [Code], [Sales Type], [Sales Code], "
            f"[Starting Date], [Ending Date], [Minimum Quantity], "
            f"[Line Discount %], [Currency Code] "
            f"FROM {tbl}{where_str}{date_clause}"
        )
        cursor = await conn.cursor()
        await cursor.execute(sql, params)
        cols = [d[0] for d in cursor.description]
        rows = await cursor.fetchall()
        result = [dict(zip(cols, row)) for row in rows]

        logger.info("promo_tools.search_line_discounts rows=%d", len(result))
        return json.dumps(result, default=str)
    finally:
        await conn.close()


async def search_campaigns(
    conn_str: str,
    company: str,
    active_only: bool = False,
    search: Optional[str] = None,
) -> str:
    """List BC promotional campaigns.

    Args:
        conn_str: ODBC connection string.
        company: BC company name prefix.
        active_only: If True, only return campaigns where today falls between
                     Starting Date and Ending Date.
        search: Substring match on campaign No. or Description.

    Returns:
        JSON array with No_, Description, Starting_Date, Ending_Date,
        Status_Code.
    """
    conn = await open_bc_connection(conn_str)
    try:
        tbl = await _find_table(conn, company, "Campaign")

        conditions: list[tuple] = []
        where_str, params = _where(conditions)

        active_clause = ""
        if active_only:
            connector = "AND" if where_str else "WHERE"
            active_clause = (
                f" {connector} "
                f"[Starting Date] <= GETDATE() "
                f"AND ([Ending Date] >= GETDATE() OR [Ending Date] IS NULL)"
            )

        search_clause = ""
        if search:
            connector = "AND" if (where_str or active_clause) else "WHERE"
            search_clause = (
                f" {connector} ([No_] LIKE ? OR [Description] LIKE ?)"
            )
            params += [f"%{search}%", f"%{search}%"]

        sql = (
            f"SELECT TOP {_MAX_ROWS} "
            f"[No_], [Description], [Starting Date], [Ending Date], [Status Code] "
            f"FROM {tbl}{where_str}{active_clause}{search_clause} "
            f"ORDER BY [Starting Date] DESC"
        )
        cursor = await conn.cursor()
        await cursor.execute(sql, params)
        cols = [d[0] for d in cursor.description]
        rows = await cursor.fetchall()
        result = [dict(zip(cols, row)) for row in rows]

        logger.info("promo_tools.search_campaigns rows=%d", len(result))
        return json.dumps(result, default=str)
    finally:
        await conn.close()
