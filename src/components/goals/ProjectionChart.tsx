import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { MonthlyProjection } from "../../types/goals";

interface Props {
  data: MonthlyProjection[];
}

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000)
    return (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)
    return (n / 1_000).toFixed(1) + "K";
  return n.toFixed(0);
}

export default function ProjectionChart({ data }: Props) {
  const categories = data.map((d) => d.label);

  const balanceSeries = data.map((d) => Math.round(d.closingBalance));
  const incomeSeries  = data.map((d) => Math.round(d.totalIncome));
  const expenseSeries = data.map((d) => Math.round(d.totalExpenses));

  // Dashed stroke for past months, solid for future
  const splitIdx = data.findIndex((d) => !d.isActual);
  const dashArray =
    splitIdx <= 0
      ? [0, 0, 0]
      : [
          // Balance line: dashed for past, solid for future (ApexCharts doesn't
          // support per-point dash, so we mark all as solid and use annotation)
          0, 0, 0,
        ];

  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 340,
      type: "line",
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: ["#465FFF", "#22C55E", "#EF4444"],
    stroke: {
      curve: "straight",
      width: [3, 2, 2],
      dashArray,
    },
    fill: {
      type: ["gradient", "solid", "solid"],
      gradient: {
        shade: "light",
        type: "vertical",
        opacityFrom: 0.18,
        opacityTo: 0,
        stops: [0, 100],
      },
      opacity: [1, 0.7, 0.7],
    },
    markers: {
      size: 4,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: { size: 6 },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit, sans-serif",
      fontSize: "13px",
      markers: { size: 6 },
    },
    grid: {
      borderColor: "#E5E7EB",
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: false } },
    },
    dataLabels: { enabled: false },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (val: number) =>{
          if (val === undefined) return "";
          return val.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          });
        },
      },
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
      labels: {
        style: { fontSize: "12px", colors: "#6B7280" },
      },
      // type: 'datetime',
    },
    yaxis: {
      labels: {
        formatter: fmt,
        style: { fontSize: "12px", colors: ["#6B7280"] },
      },
    },
    // Vertical reference line at the transition from past → projected
    annotations:
      splitIdx > 0
        ? {
            xaxis: [
              {
                x: data[splitIdx].label,
                borderColor: "#D1D5DB",
                borderWidth: 1,
                strokeDashArray: 4,
                label: {
                  text: "Today →",
                  style: {
                    color: "#6B7280",
                    fontSize: "11px",
                    background: "transparent",
                  },
                  orientation: "horizontal",
                  position: "top",
                },
              },
            ],
          }
        : {},
  };

  const series = [
    { name: "Balance", data: balanceSeries },
    { name: "Income",  data: incomeSeries },
    { name: "Expenses", data: expenseSeries },
  ];

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400 dark:text-gray-500">
        Add a balance snapshot and recurring entries to see your projection.
      </div>
    );
  }

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <div className="min-w-[600px]">
        <Chart options={options} series={series} type="area" height={340} />
      </div>
    </div>
  );
}
