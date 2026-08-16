export function formatCurrency() {
  return Intl.NumberFormat(navigator.languages, {
    currency: "inr",
    style: "currency",
  });
}
