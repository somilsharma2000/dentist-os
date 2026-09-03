export function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

export function formatDate(d) {
  if (!d) return '';
  const date = new Date(String(d).length === 10 ? d + 'T00:00:00' : d);
  if (isNaN(date)) return String(d);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function todayISO() {
  const now = new Date();
  const ist = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000);
  return ist.toISOString().slice(0, 10);
}

export function next7Days() {
  const now = new Date();
  const ist = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(ist.getTime() + i * 86400000);
    days.push({
      iso: d.toISOString().slice(0, 10),
      dayName: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    });
  }
  return days;
}
