/* export const formatNumber = (num, decimals = 2, decimalSeparator = 'coma') => {
  if (num === null || num === undefined || isNaN(num)) return '';
  const locale = decimalSeparator === 'coma' ? 'es-ES' : 'en-US';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals, // Para mostrar dos decimales
    maximumFractionDigits: decimals,
    useGrouping: false // Para no usar separador de miles
  }).format(num);
};

export const formatNumberForDisplay = (value, preferredSeparator) => {
  if (value === null || value === undefined) return '';
  const strValue = String(value);

  // Reemplaza el separador interno (punto) por el preferido para mostrar
  return strValue.replace('.', preferredSeparator);
}; */

// ==================== UTILIDADES DE FORMATO ====================
export const formatNumber = (value, decimals, separator) => {
    if (value === null || value === undefined || isNaN(value)) return '0';
    const factor = Math.pow(10, decimals);
    const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
    const fixed = rounded.toFixed(decimals);
    return separator === 'coma' ? fixed.replace('.', ',') : fixed;
};

export const formatNumberForDisplay = (value, separator) => {
  if (!value || value === '') return '';
  const strValue = String(value);
  return separator === ',' ? strValue.replace('.', ',') : strValue.replace(',', '.');
};