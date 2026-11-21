export const applicationProgressLabel = (status: string | null) =>
  status ? status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Not submitted'
