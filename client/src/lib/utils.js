export function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

export function formatDate(d) {
  if (!d) return '';
  const date = new Date(String(d).length === 10 ? d + 'T00:00:00' : d);
  if (isNaN(date)) return String(d);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// IST helpers — correct regardless of the visitor's own timezone.
// (The old getTimezoneOffset()+330 arithmetic returned UTC's date
// for anyone browsing from IST itself, among other zones.)
const istDateFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
});
const istDayFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short'
});

export function todayISO() {
  return istDateFmt.format(new Date()); // YYYY-MM-DD
}

export function next7Days() {
  // Anchor on the current IST date, then step whole calendar days.
  const [y, m, d] = todayISO().split('-').map(Number);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    days.push({
      iso: dt.toISOString().slice(0, 10),
      dayName: new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'short' }).format(dt),
      label: new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(dt)
    });
  }
  return days;
}
