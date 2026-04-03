"use client";

import ReactECharts from "echarts-for-react";

export default function PieChart({ holdings }) {
  if (holdings.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 flex items-center justify-center h-72">
        <p className="text-zinc-500 text-sm">尚無持股資料</p>
      </div>
    );
  }

  const data = holdings.map((h) => ({
    name: `${h.code} ${h.name}`,
    value: Number(((h.current_price || h.avg_cost) * h.shares).toFixed(0)),
  }));

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      formatter: "{b}: {d}%",
    },
    legend: {
      orient: "vertical",
      right: "5%",
      top: "center",
      textStyle: { color: "#a1a1aa" },
    },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        center: ["40%", "50%"],
        data,
        label: { show: false },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0,0,0,0.5)",
          },
        },
      },
    ],
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
      <p className="text-zinc-400 text-sm mb-3">持股佔比</p>
      <ReactECharts option={option} style={{ height: "260px" }} />
    </div>
  );
} 
