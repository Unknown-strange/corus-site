import styles from "./BookingCard.module.css";

export type BookingCardProps = {
  title: string;
  date: string;
  time: string;
  price: number;
  packageName: string;
};

export default function BookingCard({
  title,
  date,
  time,
  price,
  packageName,
}: BookingCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.left}>
        <h3>{title}</h3>

        <p>
          {date}
          <span> • </span>
          <em>{time}</em>
        </p>
      </div>

      <div className={styles.right}>
        <div className={styles.price}>GH₵{price}</div>

        <p>{packageName}</p>
      </div>
    </div>
  );
}