const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export const formatMoney = (value: number | string | null | undefined) =>
  value === null || value === undefined || value === '' ? '—' : rupees.format(Number(value))

export const formatDate = (value: string | null | undefined) =>
  value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export const formatDateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export const formatMonth = (value: string) =>
  new Date(`${value}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })

export const titleCase = (value: string) => value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
