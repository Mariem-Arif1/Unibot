import aioodbc


async def open_bc_connection(dsn: str) -> aioodbc.Connection:
    """Open a single-use aioodbc connection to Business Central.

    Args:
        dsn: ODBC connection string for the BC database.

    Raises:
        RuntimeError: If dsn is empty (BC_DATABASE_URL not configured).
        Exception: Any aioodbc connection error propagates to the caller.
    """
    if not dsn:
        raise RuntimeError(
            "BC_DATABASE_URL is not configured. "
            "Set it in .env to enable Business Central tools."
        )
    return await aioodbc.connect(dsn=dsn, autocommit=True)
