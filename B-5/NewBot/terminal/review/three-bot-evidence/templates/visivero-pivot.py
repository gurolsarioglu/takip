# Generated from Pivot.txt
# Source template: Pivot Points Standard

df = ohlc_df.copy()
if df.empty:
    raise ValueError("Chart OHLC data was not provided")

pivot_type = 'Traditional'
pivot_anchor = 'Auto'
max_historical = 15
is_daily_based = True
show_labels = True
show_prices = True
position_labels = 'Left'
line_width = 1
default_color = '#FB8C00'
level_visibility = {'P': True, 'R1': True, 'S1': True, 'R2': True, 'S2': True, 'R3': True, 'S3': True, 'R4': True, 'S4': True, 'R5': True, 'S5': True}
context_payload = runtime_context if isinstance(runtime_context, dict) else {}
pivot_native_payload = context_payload.get("pivotNative") if isinstance(context_payload.get("pivotNative"), dict) else {}

LEVEL_ORDER = ["P", "R1", "S1", "R2", "S2", "R3", "S3", "R4", "S4", "R5", "S5"]
LEVEL_TITLE_MAP = {
    "P": "Pivot",
    "R1": "R1",
    "S1": "S1",
    "R2": "R2",
    "S2": "S2",
    "R3": "R3",
    "S3": "S3",
    "R4": "R4",
    "S4": "S4",
    "R5": "R5",
    "S5": "S5",
}

def _timeframe_to_minutes(raw):
    value = str(raw or "60").strip().upper()
    if not value:
        return 60.0
    if value.isdigit():
        return float(value)
    match_tf = re.fullmatch(r"(\d+)([SMHDWM])", value)
    if not match_tf:
        return 60.0
    amount = float(match_tf.group(1))
    unit = match_tf.group(2)
    if unit == "S":
        return amount / 60.0
    if unit == "H":
        return amount * 60.0
    if unit == "D":
        return amount * 1440.0
    if unit == "W":
        return amount * 10080.0
    if unit == "M":
        return amount * 43200.0
    return amount

def _resolve_pivot_timeframe(anchor_name, chart_tf):
    anchor_value = str(anchor_name or "Auto")
    chart_minutes = _timeframe_to_minutes(chart_tf)
    if anchor_value == "Auto":
        if chart_minutes < 1440:
            return "1D" if chart_minutes <= 15 else "1W"
        if chart_minutes < 10080:
            return "1M"
        return "12M"

    mapping = {
        "Daily": "1D",
        "Weekly": "1W",
        "Monthly": "1M",
        "Quarterly": "3M",
        "Yearly": "12M",
        "Biyearly": "24M",
        "Triyearly": "36M",
        "Quinquennially": "60M",
        "Decennially": "120M",
    }
    return mapping.get(anchor_value, "12M")

def _build_group_labels(index, timeframe_code):
    base_index = pd.DatetimeIndex(index)
    if base_index.tz is not None:
        base_index = base_index.tz_convert(None)

    if timeframe_code == "1D":
        return pd.Index(base_index.floor("D"))
    if timeframe_code == "1W":
        return pd.Index(base_index.to_period("W-SUN").astype(str))
    if timeframe_code == "1M":
        return pd.Index(base_index.to_period("M").astype(str))
    if timeframe_code == "3M":
        return pd.Index(base_index.to_period("Q").astype(str))
    if timeframe_code == "12M":
        return pd.Index(base_index.to_period("Y").astype(str))

    match_months = re.fullmatch(r"(\d+)M", str(timeframe_code))
    if match_months:
        month_count = int(match_months.group(1))
        if month_count % 12 == 0 and month_count >= 12:
            year_bucket = month_count // 12
            start_years = ((base_index.year - 1) // year_bucket) * year_bucket + 1
            return pd.Index([f"Y{year}/{year_bucket}" for year in start_years], dtype="object")

    return pd.Index(base_index.to_period("M").astype(str))

def _traditional_levels(open_, high_, low_, close_):
    pivot = (high_ + low_ + close_) / 3.0
    range_ = high_ - low_
    return {
        "P": pivot,
        "R1": 2.0 * pivot - low_,
        "S1": 2.0 * pivot - high_,
        "R2": pivot + range_,
        "S2": pivot - range_,
        "R3": high_ + 2.0 * (pivot - low_),
        "S3": low_ - 2.0 * (high_ - pivot),
        "R4": high_ + 3.0 * (pivot - low_),
        "S4": low_ - 3.0 * (high_ - pivot),
        "R5": high_ + 4.0 * (pivot - low_),
        "S5": low_ - 4.0 * (high_ - pivot),
    }

def _classic_levels(open_, high_, low_, close_):
    pivot = (high_ + low_ + close_) / 3.0
    range_ = high_ - low_
    return {
        "P": pivot,
        "R1": 2.0 * pivot - low_,
        "S1": 2.0 * pivot - high_,
        "R2": pivot + range_,
        "S2": pivot - range_,
        "R3": pivot + 2.0 * range_,
        "S3": pivot - 2.0 * range_,
        "R4": pivot + 3.0 * range_,
        "S4": pivot - 3.0 * range_,
        "R5": np.nan,
        "S5": np.nan,
    }

def _fibonacci_levels(open_, high_, low_, close_):
    pivot = (high_ + low_ + close_) / 3.0
    range_ = high_ - low_
    return {
        "P": pivot,
        "R1": pivot + 0.382 * range_,
        "S1": pivot - 0.382 * range_,
        "R2": pivot + 0.618 * range_,
        "S2": pivot - 0.618 * range_,
        "R3": pivot + 1.0 * range_,
        "S3": pivot - 1.0 * range_,
        "R4": np.nan,
        "S4": np.nan,
        "R5": np.nan,
        "S5": np.nan,
    }

def _woodie_levels(open_, high_, low_, close_):
    pivot = (high_ + low_ + 2.0 * open_) / 4.0
    range_ = high_ - low_
    return {
        "P": pivot,
        "R1": 2.0 * pivot - low_,
        "S1": 2.0 * pivot - high_,
        "R2": pivot + range_,
        "S2": pivot - range_,
        "R3": high_ + 2.0 * (pivot - low_),
        "S3": low_ - 2.0 * (high_ - pivot),
        "R4": np.nan,
        "S4": np.nan,
        "R5": np.nan,
        "S5": np.nan,
    }

def _dm_levels(open_, high_, low_, close_):
    if close_ < open_:
        x_value = high_ + 2.0 * low_ + close_
    elif close_ > open_:
        x_value = 2.0 * high_ + low_ + close_
    else:
        x_value = high_ + low_ + 2.0 * close_
    pivot = x_value / 4.0
    return {
        "P": pivot,
        "R1": x_value / 2.0 - low_,
        "S1": x_value / 2.0 - high_,
        "R2": np.nan,
        "S2": np.nan,
        "R3": np.nan,
        "S3": np.nan,
        "R4": np.nan,
        "S4": np.nan,
        "R5": np.nan,
        "S5": np.nan,
    }

def _camarilla_levels(open_, high_, low_, close_):
    pivot = (high_ + low_ + close_) / 3.0
    range_ = high_ - low_
    factor = range_ * 1.1
    r5 = (high_ / low_) * close_ if np.isfinite(low_) and low_ != 0 else np.nan
    s5 = close_ - (r5 - close_) if np.isfinite(r5) else np.nan
    return {
        "P": pivot,
        "R1": close_ + factor / 12.0,
        "S1": close_ - factor / 12.0,
        "R2": close_ + factor / 6.0,
        "S2": close_ - factor / 6.0,
        "R3": close_ + factor / 4.0,
        "S3": close_ - factor / 4.0,
        "R4": close_ + factor / 2.0,
        "S4": close_ - factor / 2.0,
        "R5": r5,
        "S5": s5,
    }

def _calculate_levels(frame, pivot_kind):
    calculators = {
        "Traditional": _traditional_levels,
        "Classic": _classic_levels,
        "Fibonacci": _fibonacci_levels,
        "Woodie": _woodie_levels,
        "DM": _dm_levels,
        "Camarilla": _camarilla_levels,
    }
    calculator = calculators.get(str(pivot_kind), _traditional_levels)
    rows = []
    for row in frame.itertuples():
        rows.append(calculator(row.open, row.high, row.low, row.close))
    levels_frame = pd.DataFrame(rows, index=frame.index)
    for level_name in LEVEL_ORDER:
        if level_name not in levels_frame.columns:
            levels_frame[level_name] = np.nan
    return levels_frame[LEVEL_ORDER]

def _build_native_aggregated_frame(native_payload, expected_pivot_timeframe):
    if not isinstance(native_payload, dict):
        return pd.DataFrame()

    raw_rows = native_payload.get("ohlc") or []
    native_frame = pd.DataFrame(raw_rows, columns=["time", "open", "high", "low", "close", "volume"])
    if native_frame.empty:
        return native_frame

    native_frame["time"] = pd.to_numeric(native_frame["time"], errors="coerce")
    for column in ["open", "high", "low", "close"]:
        native_frame[column] = pd.to_numeric(native_frame[column], errors="coerce")
    native_frame = native_frame.dropna(subset=["time", "open", "high", "low", "close"]).copy()
    if native_frame.empty:
        return native_frame

    native_frame["time"] = native_frame["time"].astype("int64")
    native_frame = native_frame.sort_values("time").drop_duplicates(subset=["time"], keep="last").reset_index(drop=True)
    native_index = pd.DatetimeIndex(pd.to_datetime(native_frame["time"], unit="s", utc=True))
    native_frame["_pivot_group"] = _build_group_labels(native_index, expected_pivot_timeframe)
    return (
        native_frame.groupby("_pivot_group", sort=True)
        .agg({"open": "first", "high": "max", "low": "min", "close": "last"})
    )

pivot_timeframe = _resolve_pivot_timeframe(pivot_anchor, timeframe)
date_index = pd.DatetimeIndex(pd.to_datetime(df["time"], unit="s", utc=True))
group_labels = _build_group_labels(date_index, pivot_timeframe)

working = df.copy()
working["_pivot_group"] = group_labels
aggregated = (
    working.groupby("_pivot_group", sort=True)
    .agg({"open": "first", "high": "max", "low": "min", "close": "last"})
)
native_aggregated = _build_native_aggregated_frame(pivot_native_payload, pivot_timeframe)
aggregated = native_aggregated if is_daily_based and len(native_aggregated) >= 2 else aggregated

if len(aggregated) < 2:
    raise ValueError("Not enough data to calculate Pivot Points.")

levels_frame = _calculate_levels(aggregated, pivot_type).shift(1)
if max_historical > 0 and len(levels_frame) > max_historical:
    levels_frame.iloc[:-max_historical] = np.nan

levels_lookup = levels_frame.loc[~pd.Index(levels_frame.index).duplicated(keep="last")].copy()
mapped_levels = pd.DataFrame(index=df.index)
group_key_series = pd.Series(group_labels, index=df.index)
for _level_name in LEVEL_ORDER:
    level_map = levels_lookup[_level_name].to_dict()
    mapped_levels[_level_name] = group_key_series.map(level_map)
if mapped_levels.isna().all().all():
    raise ValueError("Not enough historical periods to project Pivot Points.")

if is_daily_based and len(native_aggregated) >= 2:
    native_source_timeframe = str(pivot_native_payload.get("sourceTimeframe") or pivot_native_payload.get("timeframe") or pivot_timeframe)
    print(f"Pivot source: native anchor candles from runtime context ({native_source_timeframe} -> {pivot_timeframe}).")
elif is_daily_based:
    print("Pivot approximation note: native anchor candles were not provided, so fallback local regrouping was used.")
else:
    print("Pivot source: local chart OHLC regrouping.")

for level_name in LEVEL_ORDER:
    if not level_visibility.get(level_name, True):
        continue
    level_series = pd.Series(mapped_levels[level_name], index=df.index, dtype="float64")
    if level_series.isna().all():
        continue

    segment_start_mask = level_series.notna() & (level_series.ne(level_series.shift(1)) | level_series.shift(1).isna())
    segment_ids = segment_start_mask.cumsum().where(level_series.notna(), np.nan)

    for raw_segment_id in pd.unique(segment_ids.dropna()):
        segment_index = segment_ids[segment_ids == raw_segment_id].index
        if len(segment_index) == 0:
            continue

        segment_series = pd.Series(np.nan, index=df.index, dtype="float64")
        segment_series.loc[segment_index] = level_series.loc[segment_index]
        series_id = f"pivot_{level_name.lower()}_{int(raw_segment_id)}"

        plot(
            segment_series,
            title=LEVEL_TITLE_MAP.get(level_name, level_name),
            color=default_color,
            pane="overlay",
            pane_id="pivot",
            linewidth=line_width,
            series_id=series_id,
        )

        if show_labels or show_prices:
            marker_loc = segment_index[-1] if position_labels == "Right" else segment_index[0]
            marker_pos = int(df.index.get_loc(marker_loc))
            marker_series = np.full(len(df), np.nan, dtype="float64")
            marker_value = float(level_series.loc[marker_loc])
            marker_series[marker_pos] = marker_value
            label_text = ""
            if show_labels:
                label_text = level_name
            if show_prices:
                price_text = f"{marker_value:.1f}"
                label_text = f"{label_text} ({price_text})" if label_text else price_text
            plotshape(
                marker_series,
                title=f"{level_name} Label",
                color=default_color,
                shape="circle",
                position="absolute",
                text=label_text,
                series_id=series_id,
            )

print(f"Translated Pine: Pivot Points Standard ({pivot_type}, {pivot_timeframe})")