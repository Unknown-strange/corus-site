"use client";


import {
  useEffect,
  useState,
} from "react";


import {
  CalendarDays,
  Camera,
  ShoppingBag,
  Plus,
  Package,
  ClipboardList,
  BarChart3,
} from "lucide-react";


import AdminStatCard from "./AdminStatCard";
import AdminTrendChart from "./AdminTrendChart";


import {
  TREND_SERIES,
  type DashboardSummary,
} from "@/lib/admin-dashboard";


import api from "@/lib/api";


import styles from "./AdminHome.module.css";



export default function AdminHome() {


  const [
    loading,
    setLoading
  ] = useState(true);


  const [
    error,
    setError
  ] = useState<string | null>(null);



  const [
    summary,
    setSummary
  ] =
  useState<DashboardSummary | null>(null);



  useEffect(()=>{


    const fetchDashboard = async()=>{


      try {


        const token =
          localStorage.getItem(
            "access_token"
          );


        if(!token){

          setError(
            "Please log in to continue."
          );

          setLoading(false);

          return;

        }



        const response =
          await api.admin.dashboard.summary(
            token
          );



        if(!response.ok){


          if(response.status===401){

            localStorage.removeItem(
              "access_token"
            );

            localStorage.removeItem(
              "user"
            );

            window.location.href =
              "/login";

            return;

          }



          if(response.status===403){

            setError(
              "You don't have permission to access this dashboard."
            );

            setLoading(false);

            return;

          }



          throw new Error(
            "Dashboard request failed"
          );


        }



        const data =
          await response.json();



        setSummary(data);



      }

      catch(err){

        console.error(err);

        setError(
          "Failed to load dashboard."
        );

      }


      finally{

        setLoading(false);

      }


    };


    fetchDashboard();


  },[]);




  const statCards = summary
  ? [

      {
        id:"bookings",
        label:"Today's Bookings",
        value:
          summary.todays_bookings_count
          ?.toString()
          || "0",
        delta:"+0%",
        icon:CalendarDays,
        color:"#ff5b00",
      },


      {
        id:"rentals",
        label:"Active Rentals",
        value:
          summary.active_rentals
          ?.toString()
          || "0",
        delta:"+0%",
        icon:Camera,
        color:"#2563eb",
      },


      {
        id:"orders",
        label:"Pending Orders",
        value:
          summary.pending_orders
          ?.toString()
          || "0",
        delta:"+0%",
        icon:ShoppingBag,
        color:"#22c55e",
      },

    ]

  :

    [];



  if(loading){

    return (

      <div className={styles.page}>

        <div className={styles.inner}>

          Loading dashboard...

        </div>

      </div>

    );

  }



  if(error){

    return (

      <div className={styles.page}>

        <div className={styles.errorCard}>

          <h2>
            Oops!
          </h2>

          <p>
            {error}
          </p>

        </div>

      </div>

    );

  }




  return (

    <main className={styles.page}>
      <div className={styles.inner}>
        <section className={styles.hero}>
          <span className={styles.badge}>
            Admin Dashboard
          </span>
          <div className={styles.welcome}>
            Welcome back 👋
          </div>
          <p>
            Here's an overview of today's
            activity at Corus Studio.
          </p>
        </section>

        <section className={styles.stats}>
          {
            statCards.map((stat)=>(
              <AdminStatCard
                key={stat.id}
                stat={stat}
              />
            ))
          }
        </section>

        <section className={styles.charts}>
          {
            TREND_SERIES.map(series=>(
              <AdminTrendChart
                key={series.id}
                series={series}
              />
            ))
          }
        </section>
      </div>
    </main>

  );

}