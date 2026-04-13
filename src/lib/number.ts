export const formatNumber = (num?: number, lang?: string): string => {
  if (num === undefined) return ''

  return new Intl.NumberFormat(lang).format(num)
}
