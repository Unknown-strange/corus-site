// lib/checkout-cart.ts
export function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatGhsAmount(amount: number) {
  return `GH₵${formatAmount(amount)}`;
}