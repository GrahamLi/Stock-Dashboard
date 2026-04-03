 "use client";

import ReactECharts from "echarts-for-react";

export default function LineChart({ history }) {
  if (history.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 flex items-center justify-center h-72">
        <p className="text-zinc-500 text-sm">尚無歷史資料</p>
      </div>
    );
  }

  const dates = history.map((h) => h.date);
  const values = history.map((h) => h.total_value);

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        const p = params[0];
        return `${p.axisValue}<br/>總市值：$${p.value.toLocaleString("zh-TW")}`;
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: dates,
      axisLine: { lineStyle: { color: "#52525b" } },
      axisLabel: { color: "#a1a1aa", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      axisLine: { lineStyle: { color: "#52525b" } },
      axisLabel: {
        color: "#a1a1aa",
        fontSize: 11,
        formatter: (val) => `$${(val / 10000).toFixed(0)}萬`,
      },
      splitLine: { lineStyle: { color: "#27272a" } },
    },
    series: [
      {
        type: "line",
        data: values,
        smooth: true,
        symbol: "none",
        lineStyle: { color: "#3b82f6", width: 2 },
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(59,130,246,0.3)" },
              { offset: 1, color: "rgba(59,130,246,0)" },
            ],
          },
        },
      },
    ],
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
      <p className="text-zinc-400 text-sm mb-3">總資產走勢</p>
      <ReactECharts option={option} style={{ height: "260px" }} />
    </div>
  );
}
