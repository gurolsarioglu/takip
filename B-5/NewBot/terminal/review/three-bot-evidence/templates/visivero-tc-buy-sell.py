# Generated from TC_Buy-Sell.txt
# Source template: Trader Club BUY-SELL [V.1]

df = ohlc_df.copy()
if df.empty:
    raise ValueError("Chart OHLC data was not provided")

show_buy_sell = True
sensitivity = 3.0
percent_stop = 1.0
offset_signal = 5.0
show_ribbon = True
smooth1 = 5
smooth2 = 8
show_reversal = True
show_pd_hlc = False
line_color = '#FACC15'
line_width = 1
line_style = 0
label_color = '#FACC15'
show_emas = False
src_ema1 = 'close'
len_ema1 = 7
src_ema2 = 'close'
len_ema2 = 21
src_ema3 = 'close'
len_ema3 = 144
show_swing = False
prd_swing = 10
show_dashboard = True
location_dashboard = 'Middle Right'
table_text_color = '#FFFFFF'
table_bg_color = '#2A2A2A'
show_rev_bands = True
len_rev_bands = 30

cyan = "#00DBFF"
cyan_fill = "rgba(0, 219, 255, 0.18)"
pink = "#E91E63"
pink_fill = "rgba(233, 30, 99, 0.18)"
red_fill = "rgba(255, 82, 82, 0.18)"
green_color = "#22C55E"
red_color = "#EF4444"

context_payload = runtime_context if isinstance(runtime_context, dict) else {}
mtf_payload = context_payload.get("mtfOhlc") if isinstance(context_payload.get("mtfOhlc"), dict) else {}

def _resolve_source(source_name):
    if source_name == "hl2":
        return (df["high"] + df["low"]) / 2.0
    if source_name == "hlc3":
        return (df["high"] + df["low"] + df["close"]) / 3.0
    if source_name == "ohlc4":
        return (df["open"] + df["high"] + df["low"] + df["close"]) / 4.0
    return df[source_name if source_name in df.columns else "close"].astype("float64")

def _perc_width(length, perc):
    return (df["high"].rolling(window=length, min_periods=1).max() - df["low"].rolling(window=length, min_periods=1).min()) * perc / 100.0

def _smoothrng(series, length, multiplier):
    wper = max(1, length * 2 - 1)
    avrng = pd.Series(series, index=df.index, dtype="float64").diff().abs()
    avrng = pd.Series(talib.EMA(avrng.to_numpy(dtype="float64"), timeperiod=max(1, length)), index=df.index, dtype="float64")
    return pd.Series(talib.EMA(avrng.to_numpy(dtype="float64"), timeperiod=wper), index=df.index, dtype="float64") * multiplier

def _rngfilt(series, rng_series):
    values = pd.Series(series, index=df.index, dtype="float64")
    ranges = pd.Series(rng_series, index=df.index, dtype="float64").fillna(0.0)
    filtered = np.full(len(values), np.nan, dtype="float64")
    for idx, current in enumerate(values.to_numpy(dtype="float64")):
        previous = current if idx == 0 or not np.isfinite(filtered[idx - 1]) else filtered[idx - 1]
        current_range = ranges.iloc[idx]
        if current > previous:
            filtered[idx] = previous if current - current_range < previous else current - current_range
        else:
            filtered[idx] = previous if current + current_range > previous else current + current_range
    return pd.Series(filtered, index=df.index, dtype="float64")

def _cross_over(a, b):
    a_series = pd.Series(a, index=df.index, dtype="float64")
    b_series = pd.Series(b, index=df.index, dtype="float64")
    return (a_series > b_series) & (a_series.shift(1) <= b_series.shift(1))

def _cross_under(a, b):
    a_series = pd.Series(a, index=df.index, dtype="float64")
    b_series = pd.Series(b, index=df.index, dtype="float64")
    return (a_series < b_series) & (a_series.shift(1) >= b_series.shift(1))

def _wavetrend(src, chl_len, avg_len):
    src_series = pd.Series(src, index=df.index, dtype="float64")
    esa = pd.Series(talib.EMA(src_series.to_numpy(dtype="float64"), timeperiod=chl_len), index=df.index, dtype="float64")
    deviation = pd.Series(talib.EMA((src_series - esa).abs().to_numpy(dtype="float64"), timeperiod=chl_len), index=df.index, dtype="float64")
    ci = (src_series - esa) / (0.015 * deviation.replace(0.0, np.nan))
    ci = ci.replace([np.inf, -np.inf], np.nan)
    wt1 = pd.Series(talib.EMA(ci.fillna(0.0).to_numpy(dtype="float64"), timeperiod=avg_len), index=df.index, dtype="float64")
    wt2 = wt1.rolling(window=3, min_periods=1).mean()
    return wt1, wt2

def _find_wt_divs(src, top_limit, bot_limit):
    src_values = pd.Series(src, index=df.index, dtype="float64").to_numpy(dtype="float64")
    bear = np.zeros(len(df), dtype=bool)
    bull = np.zeros(len(df), dtype=bool)
    last_top_value = np.nan
    last_top_price = np.nan
    last_bot_value = np.nan
    last_bot_price = np.nan
    for idx in range(4, len(src_values)):
        center = idx - 2
        window = src_values[idx - 4: idx + 1]
        if not np.isfinite(window).all():
            continue
        center_value = src_values[center]
        if window[0] < center_value and window[1] < center_value and center_value > window[3] and center_value > window[4] and center_value >= top_limit:
            center_price = float(df["high"].iloc[center])
            if np.isfinite(last_top_value) and center_price > last_top_price and center_value < last_top_value:
                bear[idx] = True
            last_top_value = center_value
            last_top_price = center_price
        if window[0] > center_value and window[1] > center_value and center_value < window[3] and center_value < window[4] and center_value <= bot_limit:
            center_price = float(df["low"].iloc[center])
            if np.isfinite(last_bot_value) and center_price < last_bot_price and center_value > last_bot_value:
                bull[idx] = True
            last_bot_value = center_value
            last_bot_price = center_price
    return pd.Series(bear, index=df.index), pd.Series(bull, index=df.index)

def _pivot_high(values, left, right):
    result = np.full(len(values), np.nan, dtype="float64")
    for idx in range(left, len(values) - right):
        center = values[idx]
        if not np.isfinite(center):
            continue
        window = values[idx - left: idx + right + 1]
        if np.isfinite(window).all() and center == np.nanmax(window):
            result[idx] = center
    return pd.Series(result, index=df.index, dtype="float64")

def _pivot_low(values, left, right):
    result = np.full(len(values), np.nan, dtype="float64")
    for idx in range(left, len(values) - right):
        center = values[idx]
        if not np.isfinite(center):
            continue
        window = values[idx - left: idx + right + 1]
        if np.isfinite(window).all() and center == np.nanmin(window):
            result[idx] = center
    return pd.Series(result, index=df.index, dtype="float64")

def _frame_from_rows(rows):
    frame_rows = pd.DataFrame(rows or [], columns=["time", "open", "high", "low", "close", "volume"])
    if frame_rows.empty:
        return frame_rows
    for column in ["time", "open", "high", "low", "close", "volume"]:
        if column in frame_rows.columns:
            frame_rows[column] = pd.to_numeric(frame_rows[column], errors="coerce")
    frame_rows = frame_rows.dropna(subset=["time", "open", "high", "low", "close"]).copy()
    if frame_rows.empty:
        return frame_rows
    frame_rows["time"] = frame_rows["time"].astype("int64")
    frame_rows["volume"] = frame_rows["volume"].fillna(0.0)
    return frame_rows.sort_values("time").drop_duplicates(subset=["time"], keep="last").reset_index(drop=True)

def _ema_bull_from_frame(source_frame):
    if source_frame.empty:
        return False
    ema_series = pd.Series(talib.EMA(source_frame["close"].to_numpy(dtype="float64"), timeperiod=144), index=source_frame.index, dtype="float64")
    if ema_series.dropna().empty:
        return False
    return bool(float(source_frame["close"].iloc[-1]) > float(ema_series.dropna().iloc[-1]))

source = df["close"].astype("float64")
smrng1 = _smoothrng(source, 27, 1.5)
smrng2 = _smoothrng(source, 55, sensitivity)
smrng = (smrng1 + smrng2) / 2.0
filt = _rngfilt(source, smrng)

up = np.zeros(len(df), dtype="float64")
dn = np.zeros(len(df), dtype="float64")
for idx in range(1, len(df)):
    if filt.iloc[idx] > filt.iloc[idx - 1]:
        up[idx] = up[idx - 1] + 1.0
        dn[idx] = 0.0
    elif filt.iloc[idx] < filt.iloc[idx - 1]:
        dn[idx] = dn[idx - 1] + 1.0
        up[idx] = 0.0
    else:
        up[idx] = up[idx - 1]
        dn[idx] = dn[idx - 1]

bull_cond = (source > filt) & (pd.Series(up, index=df.index) > 0)
bear_cond = (source < filt) & (pd.Series(dn, index=df.index) > 0)
last_cond = np.zeros(len(df), dtype="int64")
for idx in range(1, len(df)):
    if bool(bull_cond.iloc[idx]):
        last_cond[idx] = 1
    elif bool(bear_cond.iloc[idx]):
        last_cond[idx] = -1
    else:
        last_cond[idx] = last_cond[idx - 1]

bull = bull_cond & (pd.Series(last_cond, index=df.index).shift(1).fillna(0) == -1)
bear = bear_cond & (pd.Series(last_cond, index=df.index).shift(1).fillna(0) == 1)
count_bull = pd.Series(np.arange(len(df)), index=df.index) - pd.Series(np.where(bull, np.arange(len(df)), np.nan), index=df.index).ffill()
count_bear = pd.Series(np.arange(len(df)), index=df.index) - pd.Series(np.where(bear, np.arange(len(df)), np.nan), index=df.index).ffill()
trigger = (count_bull.fillna(len(df)) < count_bear.fillna(len(df))).astype("int64")
bar_colors = np.where(pd.Series(up, index=df.index) > pd.Series(dn, index=df.index), cyan, pink)
set_bar_colors(bar_colors, wickcolor=bar_colors, bordercolor=bar_colors)

off = _perc_width(300, offset_signal).fillna(0.0)
signal_buy_mask = bull if show_buy_sell else pd.Series(False, index=df.index)
signal_sell_mask = bear if show_buy_sell else pd.Series(False, index=df.index)
buy_label_series = (df["low"] - off).where(signal_buy_mask, np.nan)
sell_label_series = (df["high"] + off).where(signal_sell_mask, np.nan)
plotshape(buy_label_series, title="Buy Label", color=cyan, shape="labelup", position="absolute", text="Buy", series_id="tcbs_signal")
plotshape(sell_label_series, title="Sell Label", color=pink, shape="labeldown", position="absolute", text="Sell", series_id="tcbs_signal")

ribbon1 = df["close"].rolling(window=smooth1, min_periods=smooth1).mean()
ribbon2 = df["close"].rolling(window=smooth2, min_periods=smooth2).mean()
if show_ribbon:
    ribbon1_up = ribbon1.where(ribbon1 >= ribbon2)
    ribbon2_up = ribbon2.where(ribbon1 >= ribbon2)
    ribbon1_down = ribbon1.where(ribbon1 < ribbon2)
    ribbon2_down = ribbon2.where(ribbon1 < ribbon2)
    up_a = plot(ribbon1_up, title="Ribbon Fast Up", color="rgba(0,0,0,0)", pane="overlay", pane_id="tcbs", series_id="tcbs_ribbon_fast_up")
    up_b = plot(ribbon2_up, title="Ribbon Slow Up", color="rgba(0,0,0,0)", pane="overlay", pane_id="tcbs", series_id="tcbs_ribbon_slow_up")
    down_a = plot(ribbon1_down, title="Ribbon Fast Down", color="rgba(0,0,0,0)", pane="overlay", pane_id="tcbs", series_id="tcbs_ribbon_fast_down")
    down_b = plot(ribbon2_down, title="Ribbon Slow Down", color="rgba(0,0,0,0)", pane="overlay", pane_id="tcbs", series_id="tcbs_ribbon_slow_down")
    add_fill(up_a, up_b, cyan_fill, title="Ribbon Bull Fill", fill_id="tcbs_ribbon_fill_up")
    add_fill(down_a, down_b, pink_fill, title="Ribbon Bear Fill", fill_id="tcbs_ribbon_fill_down")

rsi = pd.Series(talib.RSI(df["close"].to_numpy(dtype="float64"), timeperiod=21), index=df.index, dtype="float64")
rsi_avg = pd.Series(talib.EMA(rsi.fillna(0.0).to_numpy(dtype="float64"), timeperiod=10), index=df.index, dtype="float64")
rsi_ob = rsi.gt(70) & rsi.gt(rsi_avg)
rsi_os = rsi.lt(30) & rsi.lt(rsi_avg)
if show_reversal:
    plotshape(rsi_os, title="Reversal Buy", color="rgba(0, 219, 255, 0.30)", shape="diamond", position="belowBar", text="")
    plotshape(rsi_ob, title="Reversal Sell", color="rgba(233, 30, 99, 0.30)", shape="diamond", position="aboveBar", text="")

hlc3 = (df["high"] + df["low"] + df["close"]) / 3.0
wt1, wt2 = _wavetrend(hlc3, 9, 12)
plotshape(_cross_over(wt1, wt2) & wt2.le(-53), title="Mild Buy", color=cyan, shape="cross", position="belowBar", text="")
plotshape(_cross_under(wt1, wt2) & wt2.ge(53), title="Mild Sell", color=pink, shape="cross", position="aboveBar", text="")
wt_div_bear1, wt_div_bull1 = _find_wt_divs(wt2, 15, -40)
wt_div_bear2, wt_div_bull2 = _find_wt_divs(wt2, 45, -65)
wt_div_bull = wt_div_bull1 | wt_div_bull2
wt_div_bear = wt_div_bear1 | wt_div_bear2
plotshape(wt_div_bull, title="Divergence Buy", color=cyan, shape="triangleup", position="belowBar", text="")
plotshape(wt_div_bear, title="Divergence Sell", color=pink, shape="triangledown", position="aboveBar", text="")

if show_pd_hlc:
    daily = _frame_from_rows(mtf_payload.get("1440")) if "1440" in mtf_payload else resample_ohlc("1D", df)
    if not daily.empty:
        prev_high = align_series(daily["time"], daily["high"].shift(1), df["time"])
        prev_low = align_series(daily["time"], daily["low"].shift(1), df["time"])
        prev_close = align_series(daily["time"], daily["close"].shift(1), df["time"])
        pdh_id = plot(prev_high, title="P.D.H", color=line_color, pane="overlay", pane_id="tcbs", linewidth=line_width, linestyle=line_style, series_id="tcbs_pdh")
        pdl_id = plot(prev_low, title="P.D.L", color=line_color, pane="overlay", pane_id="tcbs", linewidth=line_width, linestyle=line_style, series_id="tcbs_pdl")
        pdc_id = plot(prev_close, title="P.D.C", color=line_color, pane="overlay", pane_id="tcbs", linewidth=line_width, linestyle=line_style, series_id="tcbs_pdc")
        for label_text, series_id, value_series in [("P.D.H", pdh_id, prev_high), ("P.D.L", pdl_id, prev_low), ("P.D.C", pdc_id, prev_close)]:
            final_value = pd.Series(value_series, index=df.index, dtype="float64").dropna()
            if not final_value.empty:
                marker_series = np.full(len(df), np.nan, dtype="float64")
                marker_series[-1] = float(final_value.iloc[-1])
                plotshape(marker_series, title=label_text, color=label_color, shape="circle", position="absolute", text=label_text, series_id=series_id)

if show_emas:
    plot(pd.Series(talib.EMA(_resolve_source(src_ema1).to_numpy(dtype="float64"), timeperiod=len_ema1), index=df.index), title="EMA 1", color="#22C55E", pane="overlay", pane_id="tcbs", linewidth=2, series_id="tcbs_ema1")
    plot(pd.Series(talib.EMA(_resolve_source(src_ema2).to_numpy(dtype="float64"), timeperiod=len_ema2), index=df.index), title="EMA 2", color="#A855F7", pane="overlay", pane_id="tcbs", linewidth=2, series_id="tcbs_ema2")
    plot(pd.Series(talib.EMA(_resolve_source(src_ema3).to_numpy(dtype="float64"), timeperiod=len_ema3), index=df.index), title="EMA 3", color="#EAB308", pane="overlay", pane_id="tcbs", linewidth=2, series_id="tcbs_ema3")

if show_swing:
    pivot_highs = _pivot_high(df["high"].to_numpy(dtype="float64"), prd_swing, prd_swing)
    pivot_lows = _pivot_low(df["low"].to_numpy(dtype="float64"), prd_swing, prd_swing)
    last_high = np.nan
    last_low = np.nan
    hh = np.full(len(df), np.nan, dtype="float64")
    lh = np.full(len(df), np.nan, dtype="float64")
    hl = np.full(len(df), np.nan, dtype="float64")
    ll = np.full(len(df), np.nan, dtype="float64")
    for idx in range(len(df)):
        ph_val = pivot_highs.iloc[idx]
        pl_val = pivot_lows.iloc[idx]
        if np.isfinite(ph_val):
            if np.isfinite(last_high) and ph_val > last_high:
                hh[idx] = ph_val
            elif np.isfinite(last_high) and ph_val < last_high:
                lh[idx] = ph_val
            last_high = ph_val
        if np.isfinite(pl_val):
            if np.isfinite(last_low) and pl_val > last_low:
                hl[idx] = pl_val
            elif np.isfinite(last_low) and pl_val < last_low:
                ll[idx] = pl_val
            last_low = pl_val
    plotshape(pd.Series(hh, index=df.index), title="HH", color="rgba(34, 197, 94, 0.50)", shape="triangledown", position="absolute", text="HH")
    plotshape(pd.Series(hl, index=df.index), title="HL", color="rgba(34, 197, 94, 0.50)", shape="triangleup", position="absolute", text="HL")
    plotshape(pd.Series(lh, index=df.index), title="LH", color="rgba(239, 68, 68, 0.50)", shape="triangledown", position="absolute", text="LH")
    plotshape(pd.Series(ll, index=df.index), title="LL", color="rgba(239, 68, 68, 0.50)", shape="triangleup", position="absolute", text="LL")

if show_rev_bands:
    basis = df["close"].rolling(window=len_rev_bands, min_periods=len_rev_bands).mean()
    atr = pd.Series(talib.ATR(df["high"].to_numpy(dtype="float64"), df["low"].to_numpy(dtype="float64"), df["close"].to_numpy(dtype="float64"), timeperiod=len_rev_bands), index=df.index, dtype="float64")
    for multiplier, title, color in [
        (3, "Rev.Zone Upper 1", red_fill),
        (4, "Rev.Zone Upper 2", red_fill),
        (5, "Rev.Zone Upper 3", red_fill),
        (6, "Rev.Zone Upper 4", red_fill),
    ]:
        plot(basis + atr * multiplier, title=title, color=color, pane="overlay", pane_id="tcbs", linewidth=1, series_id=f"tcbs_{title.replace(' ', '_').lower()}")
    for multiplier, title, color in [
        (6, "Rev.Zone Lower 4", cyan_fill),
        (5, "Rev.Zone Lower 3", cyan_fill),
        (4, "Rev.Zone Lower 2", cyan_fill),
        (3, "Rev.Zone Lower 1", cyan_fill),
    ]:
        plot(basis - atr * multiplier, title=title, color=color, pane="overlay", pane_id="tcbs", linewidth=1, series_id=f"tcbs_{title.replace(' ', '_').lower()}")

if percent_stop > 0:
    signal_indices = np.flatnonzero((bull | bear).to_numpy())
    if len(signal_indices) > 0:
        last_idx = int(signal_indices[-1])
        entry_y = float(df["close"].iloc[last_idx])
        trigger_long = bool(bull.iloc[last_idx])
        stop_y = entry_y * (1.0 - percent_stop / 100.0) if trigger_long else entry_y * (1.0 + percent_stop / 100.0)
        diff = entry_y - stop_y
        tp_values = [entry_y + diff, entry_y + 2.0 * diff, entry_y + 3.0 * diff]
        levels = [
            ("Entry", entry_y, "#9CA3AF"),
            ("Stop Loss", stop_y, "#EF4444"),
            ("Take Profit 1", tp_values[0], "#22C55E"),
            ("Take Profit 2", tp_values[1], "#22C55E"),
            ("Take Profit 3", tp_values[2], "#22C55E"),
        ]
        for level_name, level_value, level_color in levels:
            line_series = np.full(len(df), np.nan, dtype="float64")
            line_series[last_idx:] = level_value
            series_id = f"tcbs_{level_name.lower().replace(' ', '_')}"
            plot(pd.Series(line_series, index=df.index), title=level_name, color=level_color, pane="overlay", pane_id="tcbs", linewidth=2, series_id=series_id)
            marker_series = np.full(len(df), np.nan, dtype="float64")
            marker_series[-1] = level_value
            plotshape(marker_series, title=level_name, color=level_color, shape="circle", position="absolute", text=f"{level_name}: {level_value:.1f}", series_id=series_id)

if show_dashboard:
    dashboard_position_map = {
        "Top Right": "top_right",
        "Middle Right": "middle_right",
        "Bottom Right": "bottom_right",
        "Top Center": "top_center",
        "Middle Center": "middle_center",
        "Bottom Center": "bottom_center",
        "Top Left": "top_left",
        "Middle Left": "middle_left",
        "Bottom Left": "bottom_left",
    }

    def _dashboard_signal_cell(text_value, is_bullish):
        return {
            "text": text_value,
            "textColor": "#000000",
            "backgroundColor": green_color if is_bullish else red_color,
        }

    current_ema = pd.Series(talib.EMA(df["close"].to_numpy(dtype="float64"), timeperiod=144), index=df.index, dtype="float64")
    ema_bull = False if current_ema.dropna().empty else bool(float(df["close"].iloc[-1]) > float(current_ema.dropna().iloc[-1]))
    mtf_keys = ["1", "3", "5", "15", "30", "60", "120", "240", "480", "1440"]
    mtf_status = {}
    for tf_key in mtf_keys:
        tf_frame = _frame_from_rows(mtf_payload.get(tf_key))
        if tf_frame.empty:
            mtf_status[tf_key] = ema_bull if tf_key == str(timeframe) else False
        else:
            mtf_status[tf_key] = _ema_bull_from_frame(tf_frame)

    table_cells = [
        {"column": 0, "row": 0, "text": "Trader Club"},
        {"column": 1, "row": 0, "text": "V.1"},
        {"column": 0, "row": 1, "text": "Current Position"},
        {"column": 1, "row": 1, **_dashboard_signal_cell("Buy" if bool(trigger.iloc[-1]) else "Sell", bool(trigger.iloc[-1]))},
        {"column": 0, "row": 2, "text": "Current Trend"},
        {"column": 1, "row": 2, **_dashboard_signal_cell("Bullish" if ema_bull else "Bearish", ema_bull)},
        {"column": 0, "row": 3, "text": "Volume"},
        {"column": 1, "row": 3, "text": f"{float(df['volume'].iloc[-1]):.0f}"},
        {"column": 0, "row": 4, "text": "Timeframe"},
        {"column": 1, "row": 4, "text": "Trends"},
    ]
    dashboard_rows = [
        ("1 min:", "1"),
        ("3 min:", "3"),
        ("5 min:", "5"),
        ("15 min:", "15"),
        ("30 min:", "30"),
        ("1 H:", "60"),
        ("2 H:", "120"),
        ("4 H:", "240"),
        ("8 H:", "480"),
        ("Daily:", "1440"),
    ]
    for row_index, (label_text, tf_key) in enumerate(dashboard_rows, start=5):
        bull_state = bool(mtf_status.get(tf_key, False))
        table_cells.append({"column": 0, "row": row_index, "text": label_text})
        table_cells.append({"column": 1, "row": row_index, **_dashboard_signal_cell("Bullish" if bull_state else "Bearish", bull_state)})

    add_table(
        "tcbs_dashboard",
        position=dashboard_position_map.get(location_dashboard, "middle_right"),
        columns=2,
        rows=15,
        cells=table_cells,
        text_color=table_text_color,
        background_color=table_bg_color,
        border_color=table_bg_color,
    )

print("Translated Pine: Trader Club BUY-SELL [V.1]")
print("Included blocks: Buy/Sell labels, ribbon, WaveTrend signals, reversal markers, PD H/L/C, EMAs, swing points, TP/SL, reversal bands, dashboard")