"use client";

import { Card } from "antd";
import {
  AreaChart,
  BarChart,
  BidirectionalBarChart,
  BoxChart,
  BulletChart,
  CirclePackingChart,
  ColumnChart,
  DualAxesChart,
  FunnelChart,
  GaugeChart,
  HeatmapChart,
  HistogramChart,
  LineChart,
  LiquidChart,
  PieChart,
  RadarChart,
  RadialBarChart,
  RoseChart,
  SankeyChart,
  ScatterChart,
  StockChart,
  SunburstChart,
  TinyArea,
  TinyColumn,
  TinyLine,
  TinyProgress,
  TinyRing,
  TreemapChart,
  VennChart,
  ViolinChart,
  WaterfallChart,
  WordCloudChart,
} from "@/shared/charts";
import { PageHeader } from "@/shared/ui/page-header";

const trend = [
  { month: "Jan", team: "Platform", value: 12 },
  { month: "Jan", team: "Product", value: 8 },
  { month: "Feb", team: "Platform", value: 18 },
  { month: "Feb", team: "Product", value: 11 },
  { month: "Mar", team: "Platform", value: 15 },
  { month: "Mar", team: "Product", value: 16 },
  { month: "Apr", team: "Platform", value: 22 },
  { month: "Apr", team: "Product", value: 14 },
  { month: "May", team: "Platform", value: 19 },
  { month: "May", team: "Product", value: 21 },
  { month: "Jun", team: "Platform", value: 26 },
  { month: "Jun", team: "Product", value: 18 },
];

const dual = [
  { month: "Jan", completed: 12, velocity: 8 },
  { month: "Feb", completed: 18, velocity: 11 },
  { month: "Mar", completed: 15, velocity: 14 },
  { month: "Apr", completed: 22, velocity: 16 },
  { month: "May", completed: 19, velocity: 15 },
  { month: "Jun", completed: 26, velocity: 18 },
];

const stock = [
  { day: "Mon", open: 20, close: 24, high: 26, low: 18 },
  { day: "Tue", open: 24, close: 22, high: 25, low: 21 },
  { day: "Wed", open: 22, close: 28, high: 29, low: 21 },
  { day: "Thu", open: 28, close: 27, high: 30, low: 25 },
  { day: "Fri", open: 27, close: 31, high: 32, low: 26 },
];

const compare = [
  { stage: "Design", side: "Planned", count: 24 },
  { stage: "Design", side: "Done", count: 18 },
  { stage: "Build", side: "Planned", count: 32 },
  { stage: "Build", side: "Done", count: 20 },
  { stage: "Review", side: "Planned", count: 16 },
  { stage: "Review", side: "Done", count: 14 },
];

const funnel = [
  { stage: "Visit", count: 80 },
  { stage: "Signup", count: 46 },
  { stage: "Active", count: 28 },
  { stage: "Paid", count: 12 },
];

const shares = [
  { region: "North", amount: 40 },
  { region: "South", amount: 25 },
  { region: "East", amount: 20 },
  { region: "West", amount: 15 },
];

const tree = {
  name: "Work",
  children: [
    { name: "Platform", value: 36 },
    { name: "Product", value: 28 },
    {
      name: "Ops",
      children: [
        { name: "Support", value: 12 },
        { name: "Docs", value: 8 },
      ],
    },
  ],
};

const scatter = [
  { hours: 2, defects: 8, team: "Platform", size: 4 },
  { hours: 4, defects: 5, team: "Platform", size: 8 },
  { hours: 6, defects: 3, team: "Product", size: 6 },
  { hours: 3, defects: 7, team: "Product", size: 3 },
  { hours: 8, defects: 2, team: "Ops", size: 10 },
  { hours: 5, defects: 4, team: "Ops", size: 5 },
];

const scores = [
  { sprint: "S1", score: 3 },
  { sprint: "S1", score: 5 },
  { sprint: "S1", score: 6 },
  { sprint: "S1", score: 8 },
  { sprint: "S1", score: 9 },
  { sprint: "S2", score: 2 },
  { sprint: "S2", score: 4 },
  { sprint: "S2", score: 4 },
  { sprint: "S2", score: 7 },
  { sprint: "S2", score: 11 },
  { sprint: "S3", score: 5 },
  { sprint: "S3", score: 6 },
  { sprint: "S3", score: 7 },
  { sprint: "S3", score: 8 },
  { sprint: "S3", score: 10 },
];

const heat = ["Mon", "Tue", "Wed", "Thu", "Fri"].flatMap((day, dayIndex) =>
  ["9", "11", "14", "16"].map((hour, hourIndex) => ({
    day,
    hour,
    count: (dayIndex + 1) * (hourIndex + 1),
  })),
);

const radar = [
  { skill: "API", team: "Platform", score: 8 },
  { skill: "UI", team: "Platform", score: 5 },
  { skill: "Data", team: "Platform", score: 7 },
  { skill: "Ops", team: "Platform", score: 6 },
  { skill: "API", team: "Product", score: 4 },
  { skill: "UI", team: "Product", score: 9 },
  { skill: "Data", team: "Product", score: 5 },
  { skill: "Ops", team: "Product", score: 3 },
];

const sankey = [
  { source: "Open", target: "Active", value: 30 },
  { source: "Open", target: "Blocked", value: 8 },
  { source: "Active", target: "Done", value: 22 },
  { source: "Active", target: "Review", value: 8 },
  { source: "Review", target: "Done", value: 6 },
];

const venn = [
  { sets: ["Design"], size: 12 },
  { sets: ["Build"], size: 16 },
  { sets: ["Review"], size: 9 },
  { sets: ["Design", "Build"], size: 4 },
];

const words = [
  { text: "Sprint", value: 40 },
  { text: "Review", value: 28 },
  { text: "Deploy", value: 22 },
  { text: "Bug", value: 18 },
  { text: "Design", value: 16 },
  { text: "Test", value: 14 },
  { text: "Docs", value: 10 },
  { text: "API", value: 12 },
];

const waterfall = [
  { step: "Open", delta: 20 },
  { step: "Added", delta: 8 },
  { step: "Removed", delta: -5 },
  { step: "Split", delta: 3 },
];

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Card size="small" title={title}>
      {children}
    </Card>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{children}</div>
    </section>
  );
}

export function GalleryScreen(): React.JSX.Element {
  return (
    <div className="h-full min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <PageHeader
          notes={[
            {
              id: "charts",
              type: "info",
              title: "Ant Design chart kit",
              description:
                "Token-colored SVG charts for Backstage. Pass rows and field names. Empty data and loading are built in.",
            },
          ]}
          title="Charts"
        />
        <Group title="Trend">
          <ChartCard title="Line">
            <LineChart data={trend} seriesField="team" xField="month" yField="value" />
          </ChartCard>
          <ChartCard title="Area">
            <AreaChart data={trend} seriesField="team" smooth xField="month" yField="value" />
          </ChartCard>
          <ChartCard title="Stock">
            <StockChart
              closeField="close"
              data={stock}
              highField="high"
              lowField="low"
              openField="open"
              xField="day"
            />
          </ChartCard>
          <ChartCard title="Dual axes">
            <DualAxesChart
              columnField="completed"
              data={dual}
              lineField="velocity"
              xField="month"
            />
          </ChartCard>
          <ChartCard title="Tiny line">
            <TinyLine data={dual} xField="month" yField="velocity" />
          </ChartCard>
          <ChartCard title="Tiny area">
            <TinyArea data={dual} xField="month" yField="completed" />
          </ChartCard>
        </Group>
        <Group title="Comparison">
          <ChartCard title="Column">
            <ColumnChart data={trend} seriesField="team" xField="month" yField="value" />
          </ChartCard>
          <ChartCard title="Bar">
            <BarChart data={shares} xField="region" yField="amount" />
          </ChartCard>
          <ChartCard title="Bidirectional bar">
            <BidirectionalBarChart
              data={compare}
              seriesField="side"
              xField="stage"
              yField="count"
            />
          </ChartCard>
          <ChartCard title="Radial bar">
            <RadialBarChart data={shares} xField="region" yField="amount" />
          </ChartCard>
          <ChartCard title="Rose">
            <RoseChart data={shares} xField="region" yField="amount" />
          </ChartCard>
          <ChartCard title="Bullet">
            <BulletChart measure={62} ranges={[40, 70, 100]} target={80} />
          </ChartCard>
          <ChartCard title="Waterfall">
            <WaterfallChart data={waterfall} xField="step" yField="delta" />
          </ChartCard>
          <ChartCard title="Tiny column">
            <TinyColumn data={shares} xField="region" yField="amount" />
          </ChartCard>
        </Group>
        <Group title="Composition">
          <ChartCard title="Pie">
            <PieChart angleField="amount" colorField="region" data={shares} innerRadius={0.6} />
          </ChartCard>
          <ChartCard title="Funnel">
            <FunnelChart data={funnel} xField="stage" yField="count" />
          </ChartCard>
          <ChartCard title="Treemap">
            <TreemapChart data={tree} />
          </ChartCard>
          <ChartCard title="Sunburst">
            <SunburstChart data={tree} />
          </ChartCard>
        </Group>
        <Group title="Distribution">
          <ChartCard title="Scatter">
            <ScatterChart
              data={scatter}
              seriesField="team"
              sizeField="size"
              xField="hours"
              yField="defects"
            />
          </ChartCard>
          <ChartCard title="Histogram">
            <HistogramChart binField="score" data={scores} />
          </ChartCard>
          <ChartCard title="Heatmap">
            <HeatmapChart colorField="count" data={heat} xField="day" yField="hour" />
          </ChartCard>
          <ChartCard title="Box">
            <BoxChart data={scores} xField="sprint" yField="score" />
          </ChartCard>
          <ChartCard title="Violin">
            <ViolinChart data={scores} xField="sprint" yField="score" />
          </ChartCard>
          <ChartCard title="Radar">
            <RadarChart data={radar} seriesField="team" xField="skill" yField="score" />
          </ChartCard>
        </Group>
        <Group title="Relation">
          <ChartCard title="Sankey">
            <SankeyChart data={sankey} />
          </ChartCard>
          <ChartCard title="Circle packing">
            <CirclePackingChart data={tree} />
          </ChartCard>
          <ChartCard title="Venn">
            <VennChart data={venn} />
          </ChartCard>
          <ChartCard title="Word cloud">
            <WordCloudChart data={words} />
          </ChartCard>
        </Group>
        <Group title="Progress">
          <ChartCard title="Gauge">
            <GaugeChart percent={0.72} thresholds={{ success: 0.8, warning: 0.5 }} />
          </ChartCard>
          <ChartCard title="Liquid">
            <LiquidChart percent={0.64} />
          </ChartCard>
          <ChartCard title="Tiny progress">
            <TinyProgress percent={0.7} />
          </ChartCard>
          <ChartCard title="Tiny ring">
            <TinyRing percent={0.7} />
          </ChartCard>
        </Group>
        <Group title="States">
          <ChartCard title="Empty">
            <ColumnChart data={[]} xField="month" yField="value" />
          </ChartCard>
          <ChartCard title="Loading">
            <ColumnChart loading data={trend} xField="month" yField="value" />
          </ChartCard>
        </Group>
      </div>
    </div>
  );
}
