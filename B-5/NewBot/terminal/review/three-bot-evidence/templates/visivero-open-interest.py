# Generated from Ointerest.txt
# Source template: Open Interest

df = ohlc_df.copy()
if df.empty:
    raise ValueError("Chart OHLC data was not provided")

runtime_symbol = str(symbol or "BTCUSDT").replace("/", "").replace(" ", "").upper()
oi_period = _normalize_open_interest_period(timeframe)
intraday_mode = oi_period != "1d"

intraday_oi = _fetch_binance_open_interest_history(runtime_symbol, oi_period, limit=min(len(df), 500))
daily_oi = _fetch_binance_open_interest_history(runtime_symbol, "1d", limit=min(len(df), 500))

if intraday_oi.empty and daily_oi.empty:
    raise ValueError(f"No Open Interest data found for symbol {runtime_symbol}.")

target_times = pd.Index(pd.Series(df["time"], dtype="int64"))

def _align_oi_frame(source_frame):
    working = source_frame.copy()
    if working.empty:
        return working
    working["time"] = pd.to_numeric(working["time"], errors="coerce")
    working = (
        working.dropna(subset=["time"])
        .assign(time=lambda frame_: frame_["time"].astype("int64"))
        .sort_values("time")
        .drop_duplicates(subset=["time"], keep="last")
        .reset_index(drop=True)
    )
    target_frame = pd.DataFrame({"time": target_times.to_numpy(), "_order": np.arange(len(target_times), dtype="int64")})
    aligned = pd.merge_asof(
        target_frame.sort_values("time"),
        working,
        on="time",
        direction="backward",
    ).sort_values("_order")
    return aligned.drop(columns=["_order"])

if intraday_mode and not intraday_oi.empty:
    aligned = _align_oi_frame(intraday_oi)
    plotcandle(
        aligned["open"],
        aligned["high"],
        aligned["low"],
        aligned["close"],
        title="Open Interest",
        pane="separate",
        pane_id="oi",
        color=aligned["color"].fillna("#14B8A6").tolist(),
        wickcolor=aligned["color"].fillna("#14B8A6").tolist(),
        bordercolor=aligned["color"].fillna("#14B8A6").tolist(),
        series_id="oi_candles",
    )
    print(f"Translated Pine: Open Interest ({oi_period} synthetic candles)")
else:
    aligned_daily = _align_oi_frame(daily_oi)
    line_colors = aligned_daily["color"].fillna("#14B8A6").tolist()
    plot(
        aligned_daily["close"],
        title="Open Interest",
        color=line_colors,
        pane="separate",
        pane_id="oi",
        linewidth=4,
        line_type=1,
        series_id="oi_close",
    )
    print("Translated Pine: Open Interest (daily step line)")