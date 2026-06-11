import json
import re
import logging
from typing import Optional

from src.tools.bc_connection import open_bc_connection

logger = logging.getLogger(__name__)

_MAX_ROWS = 200
_MAX_TABLES = 150  # keep tool results within LLM context limits
_VALID_NAME = re.compile(r"^[A-Za-z0-9_ $]+$")
_ALLOWED_OPS = {"=", "!=", ">", ">=", "<", "<=", "LIKE"}


def _validate_identifier(name: str, label: str) -> None:
    """Raise ValueError if name contains characters outside the safe whitelist."""
    if not _VALID_NAME.match(name):
        raise ValueError(
            f"Invalid {label} '{name}': only letters, digits, spaces, underscores "
            "and dollar signs are allowed."
        )


async def get_bc_tables(conn_str: str, search: Optional[str] = None) -> dict:
    """Return a capped list of user table names in the Business Central database.

    Args:
        conn_str: ODBC connection string for the BC instance.
        search: Optional substring to filter table names (case-insensitive).
                Use this to narrow results when you know part of the table name.

    Returns:
        Dict with keys:
          - tables: list of table name strings (max 150)
          - total_matched: total count matching the filter (may exceed 150)
          - truncated: True if more than 150 tables matched (refine your search)
    """
    where = "TABLE_TYPE = 'BASE TABLE'"
    params: tuple = ()
    if search:
        where += " AND TABLE_NAME LIKE ?"
        params = (f"%{search}%",)

    conn = await open_bc_connection(conn_str)
    try:
        cursor = await conn.cursor()

        # Count first — SQL does the work, nothing fetched into Python memory
        await cursor.execute(
            f"SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE {where}", params
        )
        total: int = (await cursor.fetchone())[0]

        # Fetch only up to _MAX_TABLES rows using TOP
        await cursor.execute(
            f"SELECT TOP {_MAX_TABLES} TABLE_NAME "
            f"FROM INFORMATION_SCHEMA.TABLES WHERE {where} ORDER BY TABLE_NAME",
            params,
        )
        rows = await cursor.fetchall()
        names = [row[0] for row in rows]
        truncated = total > _MAX_TABLES

        return {
            "tables": names,
            "total_matched": total,
            "truncated": truncated,
            **({"hint": f"{total} tables matched. Use 'search' to narrow down."} if truncated else {}),
        }
    finally:
        await conn.close()


async def select_bc_table(
    conn_str: str,
    table_name: str,
    columns: Optional[list[str]] = None,
    filters: Optional[list[dict]] = None,
) -> str:
    """Query a BC table and return up to 200 rows as a JSON string.

    Args:
        conn_str: ODBC connection string for the BC instance.
        table_name: Name of the table to query (validated against safe chars).
        columns: Optional list of column names to return. Returns all columns if omitted.
        filters: Optional list of dicts with keys ``column``, ``op``, ``value``.
                 All conditions are ANDed. Values are parameterized (no injection risk).
                 Allowed ops: =, !=, >, >=, <, <=, LIKE

    Returns:
        JSON string — a list of row dicts, or {"error": "..."} on failure.

    Raises:
        ValueError: If table_name, column names, or filter ops are invalid.
    """
    _validate_identifier(table_name, "table name")

    # Build SELECT column list
    if columns:
        for col in columns:
            _validate_identifier(col, "column name")
        col_clause = ", ".join(f"[{c}]" for c in columns)
    else:
        col_clause = "*"

    # Build WHERE clause
    where_parts: list[str] = []
    params: list = []
    for f in (filters or []):
        col = f.get("column", "")
        op = f.get("op", "=")
        val = f.get("value")

        _validate_identifier(col, "filter column")
        if op not in _ALLOWED_OPS:
            raise ValueError(
                f"Operator '{op}' is not allowed. "
                f"Use one of: {', '.join(sorted(_ALLOWED_OPS))}"
            )

        where_parts.append(f"[{col}] {op} ?")
        params.append(val)

    where_clause = f" WHERE {' AND '.join(where_parts)}" if where_parts else ""

    sql = f"SELECT TOP {_MAX_ROWS} {col_clause} FROM [{table_name}]{where_clause}"

    conn = await open_bc_connection(conn_str)
    try:
        cursor = await conn.cursor()
        await cursor.execute(sql, params)
        columns_desc = [desc[0] for desc in cursor.description]
        rows = await cursor.fetchall()
        result = [dict(zip(columns_desc, row)) for row in rows]
        logger.info(
            "bc_tools.select table=%s rows=%d", table_name, len(result)
        )
        return json.dumps(result, default=str)
    finally:
        await conn.close()
