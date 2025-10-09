  const formateadorDecimal = (numDecimales = 2, type = ',') => {
    const region = type === '.' ? 'en-US' : 'es-ES'; 
    return new Intl.NumberFormat(region, {
      minimumFractionDigits: numDecimales, // Para mostrar dos decimales
      maximumFractionDigits: numDecimales,
      useGrouping: false // Para no usar separador de miles
    });
  };

  export const formatNumber = (number, numDecimales, type) => formateadorDecimal(numDecimales, type).format(number)