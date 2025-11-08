/**
 * Date utility functions
 */

export function formatDate(date) {
  return date.toISOString().split('T')[0];
}

export function formatDateTime(date) {
  return date.toLocaleString();
}

export function getDaysDifference(date1, date2) {
  const diffTime = Math.abs(date2 - date1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
