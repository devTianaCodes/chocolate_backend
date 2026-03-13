export function generateOrderNumber() {
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 1e6).toString(36).toUpperCase();
  return `CH-${now}-${rand}`;
}
