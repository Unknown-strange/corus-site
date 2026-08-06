"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

import {
  RANGE_OPTIONS,
  getTrendPoints,
  summarise,
  weekdayName,
  type TrendSeries,
} from "@/lib/admin-dashboard";

import styles from "./AdminTrendChart.module.css";


type TooltipPayload = {
  payload: {
    date: string;
    value: number;
  };
};


function ChartTooltip({
  active,
  payload,
  metricLabel,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  metricLabel: string;
}) {

  if (!active || !payload?.length) {
    return null;
  }


  const point = payload[0].payload;


  return (
    <div className={styles.tooltip}>

      <p className={styles.tooltipDay}>
        {weekdayName(point.date)}
      </p>


      <p className={styles.tooltipValue}>
        {point.value}
        {" "}
        {metricLabel.toLowerCase()}
        {point.value !== 1 && "s"}
      </p>

    </div>
  );
}



export default function AdminTrendChart({
  series,
}: {
  series: TrendSeries;
}) {


  const [days, setDays] =
    useState(RANGE_OPTIONS[0].days);



  const points =
    getTrendPoints(series.id, days);



  const {
    peakDay,
    average,
  } =
    summarise(points);



  return (

    <article className={styles.card}>


      {/* HEADER */}

      <div className={styles.head}>


        <div>

          <h2 className={styles.title}>
            {series.title}
          </h2>


          <p className={styles.subtitle}>
            Performance overview
          </p>

        </div>



        <select

          className={styles.range}

          aria-label={`${series.title} date range`}

          value={days}

          onChange={(event)=>(
            setDays(
              Number(event.target.value)
            )
          )}

        >

          {
            RANGE_OPTIONS.map((option)=>(
              <option
                key={option.days}
                value={option.days}
              >
                {option.label}
              </option>
            ))
          }


        </select>


      </div>



      {/* LEGEND */}

      <div className={styles.legend}>

        <span
          className={styles.legendDot}
        />

        {series.metricLabel}

      </div>




      {/* CHART */}

      <div className={styles.chartBox}>


        <ResponsiveContainer
          width="100%"
          height="100%"
        >

          <BarChart

            data={points}

            margin={{
              top:20,
              right:0,
              left:0,
              bottom:0,
            }}

          >


            <XAxis
              dataKey="date"
              hide
            />


            <YAxis
              hide
            />



            <Tooltip

              cursor={{
                fill:
                "rgba(255,91,0,0.08)",
              }}

              content={
                <ChartTooltip
                  metricLabel={
                    series.metricLabel
                  }
                />
              }

            />



            <Bar

              dataKey="value"

              radius={[
                10,
                10,
                0,
                0
              ]}

              barSize={
                days === 7
                ? 42
                : undefined
              }

            >

              {
                points.map(
                  (_,index)=>(
                    <Cell
                      key={index}
                      fill="#ff5b00"
                    />
                  )
                )
              }


            </Bar>



          </BarChart>


        </ResponsiveContainer>


      </div>




      {/* FOOTER */}

      <div className={styles.footer}>


        <div className={styles.stat}>

          <span className={styles.statLabel}>
            Peak Day
          </span>


          <span className={styles.statValue}>
            {peakDay}
          </span>

        </div>



        <div className={styles.stat}>


          <span className={styles.statLabel}>
            Avg. Daily
          </span>


          <span className={styles.statValue}>
            {average}
          </span>


        </div>



        <Link

          href={`/admin/reports/${series.id}`}

          className={styles.report}

        >

          View Report →

        </Link>



      </div>


    </article>

  );
}