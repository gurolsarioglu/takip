# Generated from 5in1.txt
# Source template: Trader Club 5in1


df = ohlc_df.copy()
if df.empty:
    raise ValueError("Chart OHLC data was not provided")

settings = {'show_ema200': True, 'show_pmax': True, 'show_linreg': True, 'show_mavilim': True, 'show_nadaray': True, 'enable_divergence': True, 'ema_timeframe': '240', 'ema_length': 200, 'ema_source': 'close', 'ema_offset': 0, 'linreg_length': 100, 'linreg_source': 'close', 'use_upper_dev': True, 'upper_mult': 2.0, 'use_lower_dev': True, 'lower_mult': 2.0, 'show_pearson': True, 'linreg_color_upper': 'rgba(59, 130, 246, 0.150)', 'linreg_color_lower': 'rgba(239, 68, 68, 0.150)', 'fmal': 3, 'smal': 5, 'pmax_source': 'hl2', 'pmax_periods': 12, 'pmax_multiplier': 4.0, 'pmax_mav': 'EMA', 'pmax_length': 9, 'pmax_change_atr': True, 'pmax_normalize': False, 'pmax_show_support': True, 'pmax_show_signals': True, 'pmax_highlighting': False, 'nad_h': 8.0, 'nad_mult': 3.0, 'nad_source': 'close', 'nad_repaint': True, 'nad_up_color': '#14B8A6', 'nad_down_color': '#EF4444', 'show_pivot': False, 'show_mas': False, 'pivot_period': 5, 'div_source_mode': 'HIGH/LOW', 'search_div': 'REGULAR/HIDDEN', 'show_indis': 'FULL', 'show_limit': 1, 'maxpp': 20, 'maxbars': 200, 'showlast': False, 'dontconfirm': False, 'showlines': False, 'calcmacd': True, 'calcmacda': True, 'calcrsi': True, 'calcstoc': True, 'calccci': True, 'calcmom': True, 'calcobv': True, 'calcvwmacd': True, 'calccmf': True, 'calcmfi': True, 'calcext': False, 'externalindi': 'close', 'pos_reg_div_col': '#FFFFFF', 'neg_reg_div_col': '#00DEF6', 'pos_hid_div_col': '#00FF0A', 'neg_hid_div_col': '#FF0015', 'reg_div_style': 0, 'hid_div_style': 0, 'reg_div_width': 2, 'hid_div_width': 2, 'sma50_color': '#FFFFFF', 'sma200_color': '#00DEF6'}
show_ema200 = settings["show_ema200"]
show_pmax = settings["show_pmax"]
show_linreg = settings["show_linreg"]
show_mavilim = settings["show_mavilim"]
show_nadaray = settings["show_nadaray"]
enable_divergence = settings["enable_divergence"]

def _resolve_source(source_frame, source_name):
    if source_name == "hl2":
        return (source_frame["high"] + source_frame["low"]) / 2.0
    if source_name == "hlc3":
        return (source_frame["high"] + source_frame["low"] + source_frame["close"]) / 3.0
    if source_name == "ohlc4":
        return (source_frame["open"] + source_frame["high"] + source_frame["low"] + source_frame["close"]) / 4.0
    return source_frame[source_name if source_name in source_frame.columns else "close"]

def _cross_over(a, b):
    a_series = pd.Series(a, index=df.index, dtype="float64")
    b_series = pd.Series(b, index=df.index, dtype="float64")
    return (a_series > b_series) & (a_series.shift(1) <= b_series.shift(1))

def _cross_under(a, b):
    a_series = pd.Series(a, index=df.index, dtype="float64")
    b_series = pd.Series(b, index=df.index, dtype="float64")
    return (a_series < b_series) & (a_series.shift(1) >= b_series.shift(1))

if show_ema200:
    htf = resample_ohlc(settings["ema_timeframe"], df)
    if not htf.empty:
        htf_source = _resolve_source(htf, settings["ema_source"]).to_numpy(dtype="float64")
        out200 = talib.EMA(htf_source, timeperiod=settings["ema_length"])
        higher_time_frame = pd.Series(
            align_series(htf["time"], pd.Series(out200).shift(1), df["time"]),
            index=df.index,
            dtype="float64",
        )
        if settings["ema_offset"] != 0:
            higher_time_frame = higher_time_frame.shift(settings["ema_offset"])
        plot(higher_time_frame, title="EMA200", color="#F59E0B", pane="overlay", pane_id="tc5", series_id="tc5_ema200")

if show_mavilim:
    fmal = settings["fmal"]
    smal = settings["smal"]
    tmal = fmal + smal
    fmal_2 = smal + tmal
    ftmal = tmal + fmal_2
    smal_2 = fmal_2 + ftmal
    close_values = df["close"].to_numpy(dtype="float64")
    m1 = talib.WMA(close_values, timeperiod=fmal)
    m2 = talib.WMA(m1, timeperiod=smal)
    m3 = talib.WMA(m2, timeperiod=tmal)
    m4 = talib.WMA(m3, timeperiod=fmal_2)
    m5 = talib.WMA(m4, timeperiod=ftmal)
    mavw = talib.WMA(m5, timeperiod=smal_2)
    mavw_series = pd.Series(mavw, index=df.index, dtype="float64")
    mavw_prev = mavw_series.shift(1)
    mavw_colors = np.where(mavw_series > mavw_prev, "#2563EB", np.where(mavw_series < mavw_prev, "#DC2626", "#EAB308"))
    plot(mavw_series, title="MAVW", color=mavw_colors, pane="overlay", pane_id="tc5", linewidth=2, series_id="tc5_mavilim")

if show_linreg and len(df) >= max(2, settings["linreg_length"]):
    linreg_length = settings["linreg_length"]
    lin_source = _resolve_source(df, settings["linreg_source"]).astype("float64")
    window = lin_source.iloc[-linreg_length:]
    x = np.arange(1, linreg_length + 1, dtype="float64")
    y = window.to_numpy(dtype="float64")
    valid = np.isfinite(y)
    if valid.sum() >= 2:
        slope, intercept = np.polyfit(x[valid], y[valid], 1)
        base_window = intercept + slope * x
        residual = y - base_window
        std_dev = float(np.nanstd(residual, ddof=1)) if valid.sum() > 2 else 0.0
        upper_basis = df["high"].iloc[-linreg_length:].to_numpy(dtype="float64") - base_window
        lower_basis = base_window - df["low"].iloc[-linreg_length:].to_numpy(dtype="float64")
        up_dev = float(np.nanmax(upper_basis)) if np.isfinite(upper_basis).any() else 0.0
        dn_dev = float(np.nanmax(lower_basis)) if np.isfinite(lower_basis).any() else 0.0
        upper_window = base_window + (settings["upper_mult"] * std_dev if settings["use_upper_dev"] else up_dev)
        lower_window = base_window - (settings["lower_mult"] * std_dev if settings["use_lower_dev"] else dn_dev)
        base_series = np.full(len(df), np.nan, dtype="float64")
        upper_series = np.full(len(df), np.nan, dtype="float64")
        lower_series = np.full(len(df), np.nan, dtype="float64")
        base_series[-linreg_length:] = base_window
        upper_series[-linreg_length:] = upper_window
        lower_series[-linreg_length:] = lower_window
        upper_id = plot(pd.Series(upper_series, index=df.index), title="Linreg Upper", color=settings["linreg_color_upper"], pane="overlay", pane_id="tc5", series_id="tc5_linreg_upper")
        base_id = plot(pd.Series(base_series, index=df.index), title="Linreg Base", color=settings["linreg_color_lower"], pane="overlay", pane_id="tc5", series_id="tc5_linreg_base")
        lower_id = plot(pd.Series(lower_series, index=df.index), title="Linreg Lower", color=settings["linreg_color_upper"], pane="overlay", pane_id="tc5", series_id="tc5_linreg_lower")
        add_fill(upper_id, base_id, settings["linreg_color_upper"], title="Linreg Upper Fill", fill_id="tc5_linreg_fill_upper")
        add_fill(base_id, lower_id, settings["linreg_color_lower"], title="Linreg Lower Fill", fill_id="tc5_linreg_fill_lower")
        if settings["show_pearson"]:
            pearson = float(np.corrcoef(x[valid], y[valid])[0, 1]) if valid.sum() > 2 else 0.0
            marker_series = np.full(len(df), np.nan, dtype="float64")
            marker_series[-linreg_length] = lower_window[0]
            plotshape(
                pd.Series(marker_series, index=df.index, dtype="float64"),
                title="Pearson R",
                color=settings["linreg_color_upper"],
                shape="labelup",
                position="absolute",
                text=("R %.4f" % pearson),
                series_id="tc5_linreg_base",
            )

if show_pmax:
    pmax_src = _resolve_source(df, settings["pmax_source"]).astype("float64")
    pmax_values = pmax_src.to_numpy(dtype="float64")
    high_values = df["high"].to_numpy(dtype="float64")
    low_values = df["low"].to_numpy(dtype="float64")
    close_values = df["close"].to_numpy(dtype="float64")

    tr_hl = df["high"] - df["low"]
    tr_hc = (df["high"] - df["close"].shift(1)).abs()
    tr_lc = (df["low"] - df["close"].shift(1)).abs()
    true_range = pd.concat([tr_hl, tr_hc, tr_lc], axis=1).max(axis=1)
    atr_alt = true_range.rolling(window=settings["pmax_periods"], min_periods=settings["pmax_periods"]).mean()
    atr_values = talib.ATR(high_values, low_values, close_values, timeperiod=settings["pmax_periods"]) if settings["pmax_change_atr"] else atr_alt.to_numpy(dtype="float64")

    valpha = 2.0 / (settings["pmax_length"] + 1.0)
    vud1 = np.where(pmax_src > pmax_src.shift(1), pmax_src - pmax_src.shift(1), 0.0)
    vdd1 = np.where(pmax_src < pmax_src.shift(1), pmax_src.shift(1) - pmax_src, 0.0)
    vud = pd.Series(vud1, index=df.index, dtype="float64").rolling(window=9, min_periods=1).sum()
    vdd = pd.Series(vdd1, index=df.index, dtype="float64").rolling(window=9, min_periods=1).sum()
    vcmo = ((vud - vdd) / (vud + vdd)).replace([np.inf, -np.inf], np.nan).fillna(0.0)

    var_values = np.full(len(df), np.nan, dtype="float64")
    for idx, src_val in enumerate(pmax_values):
        previous = 0.0 if idx == 0 or not np.isfinite(var_values[idx - 1]) else var_values[idx - 1]
        cmo_abs = abs(float(vcmo.iloc[idx])) if np.isfinite(vcmo.iloc[idx]) else 0.0
        if np.isfinite(src_val):
            var_values[idx] = valpha * cmo_abs * src_val + (1.0 - valpha * cmo_abs) * previous

    wwalpha = 1.0 / settings["pmax_length"]
    wwma_values = np.full(len(df), np.nan, dtype="float64")
    for idx, src_val in enumerate(pmax_values):
        previous = 0.0 if idx == 0 or not np.isfinite(wwma_values[idx - 1]) else wwma_values[idx - 1]
        if np.isfinite(src_val):
            wwma_values[idx] = wwalpha * src_val + (1.0 - wwalpha) * previous

    zx_lag = settings["pmax_length"] // 2 if settings["pmax_length"] % 2 == 0 else (settings["pmax_length"] - 1) // 2
    zx_data = pmax_src + (pmax_src - pmax_src.shift(zx_lag))
    zlema_values = talib.EMA(zx_data.to_numpy(dtype="float64"), timeperiod=settings["pmax_length"])
    linreg_now = talib.LINEARREG(pmax_values, timeperiod=settings["pmax_length"])
    linreg_prev = pd.Series(linreg_now).shift(1).to_numpy(dtype="float64")
    tsf_values = linreg_now + (linreg_now - linreg_prev)

    if settings["pmax_mav"] == "SMA":
        mavg_values = pmax_src.rolling(window=settings["pmax_length"], min_periods=settings["pmax_length"]).mean().to_numpy(dtype="float64")
    elif settings["pmax_mav"] == "EMA":
        mavg_values = talib.EMA(pmax_values, timeperiod=settings["pmax_length"])
    elif settings["pmax_mav"] == "WMA":
        mavg_values = talib.WMA(pmax_values, timeperiod=settings["pmax_length"])
    elif settings["pmax_mav"] == "TMA":
        half_up = int(np.ceil(settings["pmax_length"] / 2.0))
        half_dn = int(np.floor(settings["pmax_length"] / 2.0) + 1)
        tma_base = pmax_src.rolling(window=half_up, min_periods=half_up).mean()
        mavg_values = tma_base.rolling(window=half_dn, min_periods=half_dn).mean().to_numpy(dtype="float64")
    elif settings["pmax_mav"] == "VAR":
        mavg_values = var_values
    elif settings["pmax_mav"] == "WWMA":
        mavg_values = wwma_values
    elif settings["pmax_mav"] == "ZLEMA":
        mavg_values = zlema_values
    elif settings["pmax_mav"] == "TSF":
        mavg_values = tsf_values
    else:
        mavg_values = talib.EMA(pmax_values, timeperiod=settings["pmax_length"])

    mavg_series = pd.Series(mavg_values, index=df.index, dtype="float64")
    atr_series = pd.Series(atr_values, index=df.index, dtype="float64")
    if settings["pmax_normalize"]:
        long_stop_base = mavg_series - settings["pmax_multiplier"] * atr_series / df["close"]
        short_stop_base = mavg_series + settings["pmax_multiplier"] * atr_series / df["close"]
    else:
        long_stop_base = mavg_series - settings["pmax_multiplier"] * atr_series
        short_stop_base = mavg_series + settings["pmax_multiplier"] * atr_series

    long_stop_values = np.array(long_stop_base, dtype="float64", copy=True)
    short_stop_values = np.array(short_stop_base, dtype="float64", copy=True)
    dir_values = np.ones(len(df), dtype="float64")
    for idx in range(len(df)):
        long_prev = long_stop_values[idx - 1] if idx > 0 and np.isfinite(long_stop_values[idx - 1]) else long_stop_values[idx]
        short_prev = short_stop_values[idx - 1] if idx > 0 and np.isfinite(short_stop_values[idx - 1]) else short_stop_values[idx]
        if idx > 0 and np.isfinite(mavg_values[idx]) and np.isfinite(long_prev) and np.isfinite(long_stop_values[idx]) and mavg_values[idx] > long_prev:
            long_stop_values[idx] = max(long_stop_values[idx], long_prev)
        if idx > 0 and np.isfinite(mavg_values[idx]) and np.isfinite(short_prev) and np.isfinite(short_stop_values[idx]) and mavg_values[idx] < short_prev:
            short_stop_values[idx] = min(short_stop_values[idx], short_prev)
        prev_dir = dir_values[idx - 1] if idx > 0 else 1.0
        next_dir = prev_dir
        if prev_dir == -1 and np.isfinite(mavg_values[idx]) and np.isfinite(short_prev) and mavg_values[idx] > short_prev:
            next_dir = 1.0
        elif prev_dir == 1 and np.isfinite(mavg_values[idx]) and np.isfinite(long_prev) and mavg_values[idx] < long_prev:
            next_dir = -1.0
        dir_values[idx] = next_dir

    pmax_line = np.where(dir_values == 1.0, long_stop_values, short_stop_values)
    pmax_series = pd.Series(pmax_line, index=df.index, dtype="float64")
    if settings["pmax_show_support"]:
        plot(mavg_series, title="EMA9", color="#0585E1", pane="overlay", pane_id="tc5", linewidth=2, series_id="tc5_pmax_mavg")
    plot(pmax_series, title="PMax", color="#EF4444", pane="overlay", pane_id="tc5", linewidth=2, series_id="tc5_pmax")

    if settings["pmax_show_signals"]:
        buy_signals = _cross_over(mavg_series, pmax_series)
        sell_signals = _cross_under(mavg_series, pmax_series)
        plotshape((pmax_series * 0.995).where(buy_signals), title="Buy", color="#22C55E", shape="labelup", position="absolute", text="Buy", series_id="tc5_pmax")
        plotshape((pmax_series * 1.005).where(sell_signals), title="Sell", color="#EF4444", shape="labeldown", position="absolute", text="Sell", series_id="tc5_pmax")

    if settings["pmax_highlighting"]:
        up_mavg = pd.Series(np.where(mavg_series > pmax_series, mavg_series, np.nan), index=df.index)
        up_pmax = pd.Series(np.where(mavg_series > pmax_series, pmax_series, np.nan), index=df.index)
        down_mavg = pd.Series(np.where(mavg_series < pmax_series, mavg_series, np.nan), index=df.index)
        down_pmax = pd.Series(np.where(mavg_series < pmax_series, pmax_series, np.nan), index=df.index)
        up_a = plot(up_mavg, title="PMax Up MAvg", color="rgba(34, 197, 94, 0.01)", pane="overlay", pane_id="tc5", series_id="tc5_pmax_up_mavg")
        up_b = plot(up_pmax, title="PMax Up", color="rgba(34, 197, 94, 0.01)", pane="overlay", pane_id="tc5", series_id="tc5_pmax_up")
        down_a = plot(down_mavg, title="PMax Down MAvg", color="rgba(239, 68, 68, 0.01)", pane="overlay", pane_id="tc5", series_id="tc5_pmax_down_mavg")
        down_b = plot(down_pmax, title="PMax Down", color="rgba(239, 68, 68, 0.01)", pane="overlay", pane_id="tc5", series_id="tc5_pmax_down")
        add_fill(up_a, up_b, "rgba(34, 197, 94, 0.10)", title="PMax Up Highlight", fill_id="tc5_pmax_fill_up")
        add_fill(down_a, down_b, "rgba(239, 68, 68, 0.10)", title="PMax Down Highlight", fill_id="tc5_pmax_fill_down")

if show_nadaray:
    nad_source = _resolve_source(df, settings["nad_source"]).astype("float64")
    recent_count = min(500, len(df))
    recent_values = nad_source.iloc[-recent_count:].to_numpy(dtype="float64")
    if recent_count > 2 and settings["nad_h"] > 0:
        if settings["nad_repaint"]:
            reversed_values = recent_values[::-1]
            idx_grid = np.arange(recent_count, dtype="float64")
            distance_grid = idx_grid[:, None] - idx_grid[None, :]
            weight_grid = np.exp(-((distance_grid ** 2) / (settings["nad_h"] * settings["nad_h"] * 2.0)))
            weight_sum = weight_grid.sum(axis=1)
            nwe_recent = (weight_grid @ reversed_values) / weight_sum
            sae = float(np.nanmean(np.abs(reversed_values - nwe_recent)) * settings["nad_mult"])
            upper_recent = nwe_recent + sae
            lower_recent = nwe_recent - sae
            upper_series = np.full(len(df), np.nan, dtype="float64")
            lower_series = np.full(len(df), np.nan, dtype="float64")
            upper_series[-recent_count:] = upper_recent[::-1]
            lower_series[-recent_count:] = lower_recent[::-1]
            add_table("tc5_nadaraya_mode", position="top_right", columns=1, rows=1, cells=[{"column": 0, "row": 0, "text": "Repainting Mode Enabled"}], text_color="#FFFFFF", background_color="#1e222d", border_color="#373a46")
        else:
            idx_weights = np.arange(min(500, len(df)), dtype="float64")
            static_weights = np.exp(-((idx_weights ** 2) / (settings["nad_h"] * settings["nad_h"] * 2.0)))
            out_series = np.full(len(df), np.nan, dtype="float64")
            for end_idx in range(len(df)):
                window = nad_source.iloc[max(0, end_idx - 499):end_idx + 1].to_numpy(dtype="float64")[::-1]
                weights = static_weights[:len(window)]
                denom = weights.sum()
                if denom > 0:
                    out_series[end_idx] = float(np.dot(window, weights) / denom)
            mae_series = pd.Series(np.abs(nad_source.to_numpy(dtype="float64") - out_series), index=df.index).rolling(window=min(499, len(df)), min_periods=1).mean() * settings["nad_mult"]
            upper_series = out_series + mae_series.to_numpy(dtype="float64")
            lower_series = out_series - mae_series.to_numpy(dtype="float64")

        upper_series_pd = pd.Series(upper_series, index=df.index, dtype="float64")
        lower_series_pd = pd.Series(lower_series, index=df.index, dtype="float64")
        upper_n_id = plot(upper_series_pd, title="Nadaraya Upper", color=settings["nad_up_color"], pane="overlay", pane_id="tc5", series_id="tc5_nad_upper")
        lower_n_id = plot(lower_series_pd, title="Nadaraya Lower", color=settings["nad_down_color"], pane="overlay", pane_id="tc5", series_id="tc5_nad_lower")
        add_fill(upper_n_id, lower_n_id, "rgba(20, 184, 166, 0.05)", title="Nadaraya Channel", fill_id="tc5_nad_fill")
        upper_cross = (nad_source > upper_series_pd) & (nad_source.shift(1) < upper_series_pd.shift(1))
        lower_cross = (nad_source < lower_series_pd) & (nad_source.shift(1) > lower_series_pd.shift(1))
        plotshape(nad_source.where(upper_cross), title="Nadaraya Bear", color=settings["nad_down_color"], shape="labeldown", position="absolute", text="▼", series_id="tc5_nad_upper")
        plotshape(nad_source.where(lower_cross), title="Nadaraya Bull", color=settings["nad_up_color"], shape="labelup", position="absolute", text="▲", series_id="tc5_nad_lower")

show_pivot = settings["show_pivot"]
show_mas = settings["show_mas"]
close_values = df["close"].to_numpy(dtype="float64")
high_values = df["high"].to_numpy(dtype="float64")
low_values = df["low"].to_numpy(dtype="float64")
volume_values = df["volume"].to_numpy(dtype="float64")

def _cci(source_values, period):
    source_series = pd.Series(source_values, index=df.index, dtype="float64")
    basis = source_series.rolling(window=period, min_periods=period).mean()
    mad = source_series.rolling(window=period, min_periods=period).apply(lambda arr: float(np.mean(np.abs(arr - np.mean(arr)))), raw=True)
    denom = (0.015 * mad).replace(0, np.nan)
    return ((source_series - basis) / denom).to_numpy(dtype="float64")

def _vwma(values, period):
    value_series = pd.Series(values, index=df.index, dtype="float64")
    weighted = (value_series * df["volume"]).rolling(window=period, min_periods=period).sum()
    volume_sum = df["volume"].rolling(window=period, min_periods=period).sum().replace(0, np.nan)
    return (weighted / volume_sum).to_numpy(dtype="float64")

def _render_marker(index_pos, price, text, color, series_id):
    if index_pos < 0 or index_pos >= len(df) or not np.isfinite(price):
        return
    marker_series = np.full(len(df), np.nan, dtype="float64")
    marker_series[index_pos] = float(price)
    plotshape(pd.Series(marker_series, index=df.index, dtype="float64"), title=text or "Signal", color=color, shape="circle", position="absolute", text=text, series_id=series_id)

def _render_line_segment(series_id, title, start_index, start_price, end_index, end_price, color, line_style, width):
    if start_index < 0 or end_index < 0 or start_index >= len(df) or end_index >= len(df):
        return
    if not np.isfinite(start_price) or not np.isfinite(end_price):
        return
    segment = np.full(len(df), np.nan, dtype="float64")
    segment[start_index] = float(start_price)
    segment[end_index] = float(end_price)
    plot(pd.Series(segment, index=df.index, dtype="float64"), title=title, color=color, pane="overlay", pane_id="tc5", linewidth=width, linestyle=line_style, series_id=series_id)

if show_mas:
    plot(df["close"].rolling(window=50, min_periods=50).mean(), title="SMA50", color=settings["sma50_color"], pane="overlay", pane_id="tc5", series_id="tc5_div_sma50")
    plot(df["close"].rolling(window=200, min_periods=200).mean(), title="SMA200", color=settings["sma200_color"], pane="overlay", pane_id="tc5", series_id="tc5_div_sma200")

pivot_period = settings["pivot_period"]
pivot_high_source = close_values if settings["div_source_mode"] == "CLOSE" else high_values
pivot_low_source = close_values if settings["div_source_mode"] == "CLOSE" else low_values
pivot_high_markers = np.full(len(df), np.nan, dtype="float64")
pivot_low_markers = np.full(len(df), np.nan, dtype="float64")
pivot_high_confirmed = np.full(len(df), np.nan, dtype="float64")
pivot_low_confirmed = np.full(len(df), np.nan, dtype="float64")

for center in range(pivot_period, len(df) - pivot_period):
    high_window = pivot_high_source[center - pivot_period:center + pivot_period + 1]
    low_window = pivot_low_source[center - pivot_period:center + pivot_period + 1]
    if np.isfinite(pivot_high_source[center]) and np.isfinite(high_window).all() and pivot_high_source[center] == np.nanmax(high_window):
        pivot_high_markers[center] = pivot_high_source[center]
        confirm_index = center + pivot_period
        if confirm_index < len(df):
            pivot_high_confirmed[confirm_index] = pivot_high_source[center]
    if np.isfinite(pivot_low_source[center]) and np.isfinite(low_window).all() and pivot_low_source[center] == np.nanmin(low_window):
        pivot_low_markers[center] = pivot_low_source[center]
        confirm_index = center + pivot_period
        if confirm_index < len(df):
            pivot_low_confirmed[confirm_index] = pivot_low_source[center]

if show_pivot:
    plotshape(pd.Series(pivot_high_markers, index=df.index), title="Pivot High", color="#00DEF6", shape="labeldown", position="absolute", text="H", series_id="tc5_pivot_high")
    plotshape(pd.Series(pivot_low_markers, index=df.index), title="Pivot Low", color="#FFFFFF", shape="labelup", position="absolute", text="L", series_id="tc5_pivot_low")

if enable_divergence:
    def _positive_divergence_at(current_index, indicator_values, cond, pivot_pool):
        if current_index <= 0:
            return 0
        current_value = indicator_values[current_index]
        previous_value = indicator_values[current_index - 1]
        current_close = close_values[current_index]
        previous_close = close_values[current_index - 1]
        if not np.isfinite(current_value):
            return 0
        if not (settings["dontconfirm"] or (np.isfinite(previous_value) and current_value > previous_value) or (np.isfinite(previous_close) and current_close > previous_close)):
            return 0
        startpoint = 0 if settings["dontconfirm"] else 1
        prsc = close_values if settings["div_source_mode"] == "CLOSE" else low_values
        idx_now = current_index - startpoint
        if idx_now < 0 or not np.isfinite(indicator_values[idx_now]) or not np.isfinite(prsc[idx_now]) or not np.isfinite(close_values[idx_now]):
            return 0
        for confirm_index, pivot_value in pivot_pool[: settings["maxpp"]]:
            length = current_index - confirm_index + pivot_period
            if length > settings["maxbars"]:
                break
            pivot_index = current_index - length
            if pivot_index < 0 or length <= 5:
                continue
            src_past = indicator_values[pivot_index]
            if not np.isfinite(src_past) or not np.isfinite(pivot_value):
                continue
            condition_match = ((cond == 1 and indicator_values[idx_now] > src_past and prsc[idx_now] < pivot_value) or (cond == 2 and indicator_values[idx_now] < src_past and prsc[idx_now] > pivot_value))
            if not condition_match:
                continue
            denominator = length - startpoint
            if denominator <= 0:
                continue
            slope1 = (indicator_values[idx_now] - src_past) / denominator
            slope2 = (close_values[idx_now] - close_values[pivot_index]) / denominator
            virtual_line1 = indicator_values[idx_now] - slope1
            virtual_line2 = close_values[idx_now] - slope2
            arrived = True
            for y in range(1 + startpoint, length):
                scan_index = current_index - y
                if scan_index < 0 or not np.isfinite(indicator_values[scan_index]) or not np.isfinite(close_values[scan_index]):
                    arrived = False
                    break
                if indicator_values[scan_index] < virtual_line1 or close_values[scan_index] < virtual_line2:
                    arrived = False
                    break
                virtual_line1 -= slope1
                virtual_line2 -= slope2
            if arrived:
                return length
        return 0

    def _negative_divergence_at(current_index, indicator_values, cond, pivot_pool):
        if current_index <= 0:
            return 0
        current_value = indicator_values[current_index]
        previous_value = indicator_values[current_index - 1]
        current_close = close_values[current_index]
        previous_close = close_values[current_index - 1]
        if not np.isfinite(current_value):
            return 0
        if not (settings["dontconfirm"] or (np.isfinite(previous_value) and current_value < previous_value) or (np.isfinite(previous_close) and current_close < previous_close)):
            return 0
        startpoint = 0 if settings["dontconfirm"] else 1
        prsc = close_values if settings["div_source_mode"] == "CLOSE" else high_values
        idx_now = current_index - startpoint
        if idx_now < 0 or not np.isfinite(indicator_values[idx_now]) or not np.isfinite(prsc[idx_now]) or not np.isfinite(close_values[idx_now]):
            return 0
        for confirm_index, pivot_value in pivot_pool[: settings["maxpp"]]:
            length = current_index - confirm_index + pivot_period
            if length > settings["maxbars"]:
                break
            pivot_index = current_index - length
            if pivot_index < 0 or length <= 5:
                continue
            src_past = indicator_values[pivot_index]
            if not np.isfinite(src_past) or not np.isfinite(pivot_value):
                continue
            condition_match = ((cond == 1 and indicator_values[idx_now] < src_past and prsc[idx_now] > pivot_value) or (cond == 2 and indicator_values[idx_now] > src_past and prsc[idx_now] < pivot_value))
            if not condition_match:
                continue
            denominator = length - startpoint
            if denominator <= 0:
                continue
            slope1 = (indicator_values[idx_now] - src_past) / denominator
            slope2 = (close_values[idx_now] - close_values[pivot_index]) / denominator
            virtual_line1 = indicator_values[idx_now] - slope1
            virtual_line2 = close_values[idx_now] - slope2
            arrived = True
            for y in range(1 + startpoint, length):
                scan_index = current_index - y
                if scan_index < 0 or not np.isfinite(indicator_values[scan_index]) or not np.isfinite(close_values[scan_index]):
                    arrived = False
                    break
                if indicator_values[scan_index] > virtual_line1 or close_values[scan_index] > virtual_line2:
                    arrived = False
                    break
                virtual_line1 -= slope1
                virtual_line2 -= slope2
            if arrived:
                return length
        return 0

    macd_values, signal_values, macd_hist_values = talib.MACD(close_values, fastperiod=12, slowperiod=26, signalperiod=9)
    rsi_values = talib.RSI(close_values, timeperiod=14)
    moment_values = talib.MOM(close_values, timeperiod=10)
    cci_values = _cci(close_values, 10)
    obv_values = talib.OBV(close_values, volume_values)
    highest_14 = pd.Series(high_values, index=df.index).rolling(window=14, min_periods=14).max()
    lowest_14 = pd.Series(low_values, index=df.index).rolling(window=14, min_periods=14).min()
    stoch_base = ((pd.Series(close_values, index=df.index) - lowest_14) / (highest_14 - lowest_14).replace(0, np.nan)) * 100.0
    stoch_values = stoch_base.rolling(window=3, min_periods=3).mean().to_numpy(dtype="float64")
    ma_fast = _vwma(close_values, 12)
    ma_slow = _vwma(close_values, 26)
    vwmacd_values = ma_fast - ma_slow
    range_values = high_values - low_values
    cmfm = np.where(np.abs(range_values) > 1e-12, (close_values - low_values - (high_values - close_values)) / range_values, 0.0)
    cmfv = cmfm * volume_values
    cmf_values = (pd.Series(cmfv, index=df.index).rolling(window=21, min_periods=21).sum() / pd.Series(volume_values, index=df.index).rolling(window=21, min_periods=21).sum().replace(0, np.nan)).to_numpy(dtype="float64")
    mfi_values = talib.MFI(high_values, low_values, close_values, volume_values, timeperiod=14)
    external_values = _resolve_source(df, settings["externalindi"]).to_numpy(dtype="float64")

    indicator_entries = [
        ("MACD", settings["calcmacd"], macd_values),
        ("MACDH", settings["calcmacda"], macd_hist_values),
        ("RSI", settings["calcrsi"], rsi_values),
        ("STOCH", settings["calcstoc"], stoch_values),
        ("CCI", settings["calccci"], cci_values),
        ("MOM", settings["calcmom"], moment_values),
        ("OBV", settings["calcobv"], obv_values),
        ("VWMACD", settings["calcvwmacd"], vwmacd_values),
        ("CMF", settings["calccmf"], cmf_values),
        ("MFI", settings["calcmfi"], mfi_values),
        ("EXT", settings["calcext"], external_values),
    ]

    low_pivot_pool = []
    high_pivot_pool = []
    latest_positive_event = None
    latest_negative_event = None
    latest_lines = []

    for current_index in range(len(df)):
        if np.isfinite(pivot_low_confirmed[current_index]):
            low_pivot_pool.insert(0, (current_index, float(pivot_low_confirmed[current_index])))
            low_pivot_pool = low_pivot_pool[:20]
        if np.isfinite(pivot_high_confirmed[current_index]):
            high_pivot_pool.insert(0, (current_index, float(pivot_high_confirmed[current_index])))
            high_pivot_pool = high_pivot_pool[:20]
        if current_index <= pivot_period or (not low_pivot_pool and not high_pivot_pool):
            continue

        event_lines = []
        used_distances = set()
        top_count = 0
        bottom_count = 0
        top_color = settings["neg_reg_div_col"]
        bottom_color = settings["pos_reg_div_col"]

        for indicator_name, is_enabled, indicator_values in indicator_entries:
            if not is_enabled:
                continue
            positive_regular = _positive_divergence_at(current_index, indicator_values, 1, low_pivot_pool) if settings["search_div"] in ("REGULAR", "REGULAR/HIDDEN") else 0
            negative_regular = _negative_divergence_at(current_index, indicator_values, 1, high_pivot_pool) if settings["search_div"] in ("REGULAR", "REGULAR/HIDDEN") else 0
            positive_hidden = _positive_divergence_at(current_index, indicator_values, 2, low_pivot_pool) if settings["search_div"] in ("HIDDEN", "REGULAR/HIDDEN") else 0
            negative_hidden = _negative_divergence_at(current_index, indicator_values, 2, high_pivot_pool) if settings["search_div"] in ("HIDDEN", "REGULAR/HIDDEN") else 0

            divergence_values = [positive_regular, negative_regular, positive_hidden, negative_hidden]
            colors = [settings["pos_reg_div_col"], settings["neg_reg_div_col"], settings["pos_hid_div_col"], settings["neg_hid_div_col"]]
            line_styles = [settings["reg_div_style"], settings["reg_div_style"], settings["hid_div_style"], settings["hid_div_style"]]
            line_widths = [settings["reg_div_width"], settings["reg_div_width"], settings["hid_div_width"], settings["hid_div_width"]]

            for div_type, div_length in enumerate(divergence_values):
                if div_length <= 0:
                    continue
                if div_type % 2 == 1:
                    top_count += 1
                    top_color = colors[div_type]
                else:
                    bottom_count += 1
                    bottom_color = colors[div_type]
                if div_length in used_distances or not settings["showlines"]:
                    continue
                used_distances.add(div_length)
                startpoint = 0 if settings["dontconfirm"] else 1
                pivot_index = current_index - div_length
                current_price_index = current_index - startpoint
                if pivot_index < 0 or current_price_index < 0:
                    continue
                if settings["div_source_mode"] == "CLOSE":
                    start_price = close_values[pivot_index]
                    end_price = close_values[current_price_index]
                elif div_type % 2 == 0:
                    start_price = low_values[pivot_index]
                    end_price = low_values[current_price_index]
                else:
                    start_price = high_values[pivot_index]
                    end_price = high_values[current_price_index]
                event_lines.append(
                    {
                        "series_id": "tc5_div_%d_%d_%d" % (current_index, pivot_index, div_type),
                        "title": indicator_name + " Div",
                        "start_index": pivot_index,
                        "start_price": start_price,
                        "end_index": current_price_index,
                        "end_price": end_price,
                        "color": colors[div_type],
                        "line_style": line_styles[div_type],
                        "width": line_widths[div_type],
                    }
                )

        if top_count + bottom_count < settings["show_limit"]:
            continue

        if settings["showlast"]:
            latest_lines = event_lines
            latest_positive_event = None
            latest_negative_event = None
            if top_count > 0:
                latest_negative_event = {"index": current_index, "price": float(max(high_values[current_index], high_values[current_index - 1] if current_index > 0 else high_values[current_index])), "color": top_color, "text": "◆"}
            if bottom_count > 0:
                latest_positive_event = {"index": current_index, "price": float(min(low_values[current_index], low_values[current_index - 1] if current_index > 0 else low_values[current_index])), "color": bottom_color, "text": "◆"}
            continue

        for line_info in event_lines:
            _render_line_segment(line_info["series_id"], line_info["title"], line_info["start_index"], line_info["start_price"], line_info["end_index"], line_info["end_price"], line_info["color"], line_info["line_style"], line_info["width"])
        if top_count > 0:
            _render_marker(current_index, float(max(high_values[current_index], high_values[current_index - 1] if current_index > 0 else high_values[current_index])), "◆", top_color, "tc5_div_top_%d" % current_index)
        if bottom_count > 0:
            _render_marker(current_index, float(min(low_values[current_index], low_values[current_index - 1] if current_index > 0 else low_values[current_index])), "◆", bottom_color, "tc5_div_bottom_%d" % current_index)

    if settings["showlast"]:
        for line_info in latest_lines:
            _render_line_segment(line_info["series_id"], line_info["title"], line_info["start_index"], line_info["start_price"], line_info["end_index"], line_info["end_price"], line_info["color"], line_info["line_style"], line_info["width"])
        if latest_negative_event:
            _render_marker(latest_negative_event["index"], latest_negative_event["price"], latest_negative_event["text"], latest_negative_event["color"], "tc5_div_top_last")
        if latest_positive_event:
            _render_marker(latest_positive_event["index"], latest_positive_event["price"], latest_positive_event["text"], latest_positive_event["color"], "tc5_div_bottom_last")

print("Translated Pine: Trader Club 5in1")
print("Included blocks: EMA200, Linreg, Mavilim, PMax, Nadaraya, Divergence")
