export const colors = {
  navy: '#10213f',
  blue: '#1746a2',
  blueDark: '#0b2f72',
  sky: '#eef5ff',
  muted: '#69768d',
  line: '#e3eaf4',
  gold: '#f4b523',
  green: '#14bc78',
  red: '#e5484d',
  violet: '#7859e8',
  bg: '#f4f7fc',
  card: '#ffffff',
}

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 }

export const shadow = {
  shadowColor: '#17315f',
  shadowOpacity: 0.06,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 5 },
  elevation: 2,
}

export const scoreColor = (score: number | null | undefined) => {
  if (!score) return colors.muted
  if (score >= 750) return colors.green
  if (score >= 650) return colors.gold
  return colors.red
}
