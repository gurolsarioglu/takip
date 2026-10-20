# Generated from TC_S-R.txt
# Source template: Trader Club S/R

df = ohlc_df.copy()
if df.empty:
    raise ValueError("Chart OHLC data was not provided")

enable_sr = True
color_sup = '#00DBFF'
color_res = '#E91E63'
strength_sr = 2
line_style = 1
line_width = 2
use_zones = True
use_hl_zones = True
zone_width = 2
expand_sr = True

rb = 10
prd = 284
channel_width = 10
label_loc = 55

def _perc_width(length, perc, index_pos):
    start = max(0, index_pos - length + 1)
    high_slice = df["high"].iloc[start:index_pos + 1]
    low_slice = df["low"].iloc[start:index_pos + 1]
    if high_slice.empty or low_slice.empty:
        return 0.0
    return float((high_slice.max() - low_slice.min()) * perc / 100.0)

def _pivot_high_confirmed(values, left, right):
    confirmed = np.full(len(values), np.nan, dtype="float64")
    for center in range(left, len(values) - right):
        center_value = values[center]
        if not np.isfinite(center_value):
            continue
        window = values[center - left:center + right + 1]
        if np.isfinite(window).all() and center_value == np.nanmax(window):
            confirm_index = center + right
            if confirm_index < len(values):
                confirmed[confirm_index] = center_value
    return confirmed

def _pivot_low_confirmed(values, left, right):
    confirmed = np.full(len(values), np.nan, dtype="float64")
    for center in range(left, len(values) - right):
        center_value = values[center]
        if not np.isfinite(center_value):
            continue
        window = values[center - left:center + right + 1]
        if np.isfinite(window).all() and center_value == np.nanmin(window):
            confirm_index = center + right
            if confirm_index < len(values):
                confirmed[confirm_index] = center_value
    return confirmed

def _horizontal_series(value, bars_back):
    series = np.full(len(df), np.nan, dtype="float64")
    start = 0 if expand_sr else max(0, len(df) - bars_back)
    series[start:] = value
    return pd.Series(series, index=df.index, dtype="float64")

def _label_marker(series_id, value, text, color):
    marker_series = np.full(len(df), np.nan, dtype="float64")
    marker_series[-1] = float(value)
    plotshape(
        marker_series,
        title=text,
        color=color,
        shape="circle",
        position="absolute",
        text=text,
        series_id=series_id,
    )

if not enable_sr:
    print("Translated Pine: Trader Club S/R (disabled)")
else:
    high_values = df["high"].to_numpy(dtype="float64")
    low_values = df["low"].to_numpy(dtype="float64")
    close_values = df["close"].to_numpy(dtype="float64")
    ph = _pivot_high_confirmed(high_values, rb, rb)
    pl = _pivot_low_confirmed(low_values, rb, rb)

    final_highest_level = np.nan
    final_lowest_level = np.nan
    final_sr_levels = [np.nan] * 21

    for current_index in range(len(df)):
        if not (np.isfinite(ph[current_index]) or np.isfinite(pl[current_index])):
            continue

        sr_levels = [np.nan] * 21
        aas = [True] * 41
        prd_start = max(0, current_index - prd + 1)
        prd_highest = float(np.nanmax(high_values[prd_start:current_index + 1]))
        prd_lowest = float(np.nanmin(low_values[prd_start:current_index + 1]))
        cwidth = _perc_width(prd, channel_width, current_index)

        highest_level = prd_lowest
        lowest_level = prd_highest
        countpp = 0

        for x in range(prd + 1):
            j = current_index - x
            if j < 0 or not np.isfinite(close_values[j]):
                break
            if np.isfinite(ph[j]) or np.isfinite(pl[j]):
                highest_level = max(highest_level, ph[j] if np.isfinite(ph[j]) else prd_lowest, pl[j] if np.isfinite(pl[j]) else prd_lowest)
                lowest_level = min(lowest_level, ph[j] if np.isfinite(ph[j]) else prd_highest, pl[j] if np.isfinite(pl[j]) else prd_highest)
                countpp += 1
                if countpp > 40:
                    break
                if aas[countpp]:
                    center_index = j - rb
                    if center_index < 0:
                        continue
                    pivot_price = high_values[center_index] if np.isfinite(ph[j]) else low_values[center_index]
                    upl = pivot_price + cwidth
                    dnl = pivot_price - cwidth
                    tmp = [True] * 41
                    cnt = 0
                    tpoint = 0
                    for xx in range(prd + 1):
                        k = current_index - xx
                        if k < 0 or not np.isfinite(close_values[k]):
                            break
                        if np.isfinite(ph[k]) or np.isfinite(pl[k]):
                            cnt += 1
                            if cnt > 40:
                                break
                            if aas[cnt]:
                                changed = False
                                center_k = k - rb
                                if center_k < 0:
                                    continue
                                if np.isfinite(ph[k]):
                                    candidate_high = high_values[center_k]
                                    if dnl <= candidate_high <= upl:
                                        tpoint += 1
                                        changed = True
                                if np.isfinite(pl[k]):
                                    candidate_low = low_values[center_k]
                                    if dnl <= candidate_low <= upl:
                                        tpoint += 1
                                        changed = True
                                if changed and cnt < 41:
                                    tmp[cnt] = False
                    if tpoint >= strength_sr:
                        for g in range(41):
                            if not tmp[g]:
                                aas[g] = False
                        if np.isfinite(ph[j]) and countpp < 21:
                            sr_levels[countpp] = high_values[center_index]
                        if np.isfinite(pl[j]) and countpp < 21:
                            sr_levels[countpp] = low_values[center_index]

        final_highest_level = highest_level
        final_lowest_level = lowest_level
        final_sr_levels = list(sr_levels)

    if not np.isfinite(final_highest_level):
        final_highest_level = float(np.nanmax(high_values[max(0, len(df) - prd):]))
    if not np.isfinite(final_lowest_level):
        final_lowest_level = float(np.nanmin(low_values[max(0, len(df) - prd):]))

    close_value = float(close_values[-1])
    zone_perc = _perc_width(300, zone_width, len(df) - 1)
    hi_color = color_sup if close_value >= final_highest_level else color_res
    lo_color = color_sup if close_value >= final_lowest_level else color_res

    highest_id = "tcsr_high_level"
    lowest_id = "tcsr_low_level"
    plot(_horizontal_series(final_highest_level, 311), title="High Level", color=hi_color, pane="overlay", pane_id="tcsr", linewidth=line_width, linestyle=line_style, series_id=highest_id)
    plot(_horizontal_series(final_lowest_level, 311), title="Low Level", color=lo_color, pane="overlay", pane_id="tcsr", linewidth=line_width, linestyle=line_style, series_id=lowest_id)
    _label_marker(highest_id, final_highest_level, f"High Level : {final_highest_level:.1f}", hi_color)
    _label_marker(lowest_id, final_lowest_level, f"Low Level : {final_lowest_level:.1f}", lo_color)

    if use_hl_zones and zone_perc > 0:
        highest_upper_id = plot(_horizontal_series(final_highest_level + zone_perc, 311), title="High Zone Upper", color="rgba(0,0,0,0)", pane="overlay", pane_id="tcsr", linewidth=1, series_id="tcsr_high_zone_upper")
        highest_lower_id = plot(_horizontal_series(final_highest_level - zone_perc, 311), title="High Zone Lower", color="rgba(0,0,0,0)", pane="overlay", pane_id="tcsr", linewidth=1, series_id="tcsr_high_zone_lower")
        lowest_upper_id = plot(_horizontal_series(final_lowest_level + zone_perc, 311), title="Low Zone Upper", color="rgba(0,0,0,0)", pane="overlay", pane_id="tcsr", linewidth=1, series_id="tcsr_low_zone_upper")
        lowest_lower_id = plot(_horizontal_series(final_lowest_level - zone_perc, 311), title="Low Zone Lower", color="rgba(0,0,0,0)", pane="overlay", pane_id="tcsr", linewidth=1, series_id="tcsr_low_zone_lower")
        add_fill(highest_upper_id, highest_lower_id, "rgba(0, 219, 255, 0.20)" if hi_color == color_sup else "rgba(233, 30, 99, 0.20)", title="High Zone", fill_id="tcsr_high_zone_fill")
        add_fill(lowest_upper_id, lowest_lower_id, "rgba(0, 219, 255, 0.20)" if lo_color == color_sup else "rgba(233, 30, 99, 0.20)", title="Low Zone", fill_id="tcsr_low_zone_fill")

    active_levels = [level for level in final_sr_levels if np.isfinite(level)]
    for level_index, level_value in enumerate(active_levels, start=1):
        level_color = color_sup if close_value >= level_value else color_res
        series_id = f"tcsr_level_{level_index}"
        plot(_horizontal_series(level_value, 355), title=f"SR {level_index}", color=level_color, pane="overlay", pane_id="tcsr", linewidth=line_width, linestyle=line_style, series_id=series_id)
        _label_marker(series_id, level_value, f"{level_value:.1f}", level_color)

        if use_zones and zone_perc > 0:
            upper_id = plot(_horizontal_series(level_value + zone_perc, 355), title=f"SR {level_index} Zone Upper", color="rgba(0,0,0,0)", pane="overlay", pane_id="tcsr", linewidth=1, series_id=f"tcsr_level_{level_index}_upper")
            lower_id = plot(_horizontal_series(level_value - zone_perc, 355), title=f"SR {level_index} Zone Lower", color="rgba(0,0,0,0)", pane="overlay", pane_id="tcsr", linewidth=1, series_id=f"tcsr_level_{level_index}_lower")
            add_fill(
                upper_id,
                lower_id,
                "rgba(0, 219, 255, 0.20)" if level_color == color_sup else "rgba(233, 30, 99, 0.20)",
                title=f"SR {level_index} Zone",
                fill_id=f"tcsr_level_{level_index}_fill",
            )

    print(f"Translated Pine: Trader Club S/R ({len(active_levels)} active levels)")