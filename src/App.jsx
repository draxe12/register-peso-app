import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Calculator, Target, Scale, Upload, FileText, Camera, X, Save, Download, History, Trash2, BarChart3, Moon, Sun, Monitor, Edit, Menu, Sparkles, Copy, Mic, MicOff } from 'lucide-react';
import InputNumber from './components/InputNumber';
import { formatNumber, formatNumberForDisplay } from './utils/format';
import { ChevronDownIcon, ChevronUpIcon, CommaIcon, DotIcon } from './components/icons';

// Agregar estilos de animación
const style = document.createElement('style');
style.textContent = `
  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }
`;
document.head.appendChild(style);

// ==================== HOOKS PERSONALIZADOS ====================

const useSpeechRecognitionOld = (lang = 'es-ES') => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
          setError('El reconocimiento de voz no es compatible con este navegador.');
          return;
      }

      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;
      recognition.continuous = false;
      recognition.lang = lang;
      recognition.interimResults = false;

      recognition.onstart = () => {
          setIsListening(true);
          setError('');
      };

      recognition.onresult = (event) => {
          const result = event.results[0][0].transcript;
          setTranscript(result);
      };

      recognition.onend = () => {
          setIsListening(false);
      };

      recognition.onerror = (event) => {
          setError(`Error de reconocimiento: ${event.error}`);
          setIsListening(false);
      };

      // Limpieza al desmontar el componente
      return () => {
          if (recognitionRef.current) {
              recognitionRef.current.stop();
          }
      };
  }, [lang]);

  const startListening = () => {
        if (recognitionRef.current && !isListening) {
            setTranscript(''); // Limpiar transcripción anterior
            recognitionRef.current.start();
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    };

    // Devolvemos el estado y las funciones de control
    return {
        transcript,
        isListening,
        error,
        startListening,
        stopListening
    };
};

const useSpeechRecognition = (lang = 'es-ES') => {
    const [transcript, setTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState('');
    const recognitionRef = useRef(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setError('El reconocimiento de voz no es compatible con este navegador.');
            return;
        }

        recognitionRef.current = new SpeechRecognition();
        const recognition = recognitionRef.current;
        recognition.continuous = false; // Mantener la escucha continua
        recognition.lang = lang;
        recognition.interimResults = true; // <--- CAMBIO CLAVE: Resultados intermedios

        recognition.onstart = () => {
            setIsListening(true);
            setError('');
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            // Iteramos sobre todos los resultados obtenidos
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            
            // Actualizamos el estado con la transcripción completa (final + intermedia)
            // Esto da la sensación de escritura en tiempo real.
            setTranscript(finalTranscript + interimTranscript);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onerror = (event) => {
            setError(`Error de reconocimiento: ${event.error}`);
            setIsListening(false);
        };

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [lang]);

    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            // No limpiamos transcript aquí para permitir adiciones continuas si es necesario
            recognitionRef.current.start();
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    };

    return {
        transcript,
        isListening,
        error,
        startListening,
        stopListening,
        setTranscript // Exportamos setTranscript para poder limpiarlo manualmente si es necesario
    };
};


// Hook para ClickOutside
const useClickOutside = (refs, handler) => {
  useEffect(() => {
    const listener = (event) => {
      // Verificamos si el clic ocurrió dentro de alguna de las referencias
      const isClickInside = refs.some(ref => ref.current && ref.current.contains(event.target));
      
      if (isClickInside) {
        return;
      }
      handler(event);
    };

    document.addEventListener('click', listener);

    return () => {
      document.removeEventListener('click', listener);
    };
  }, [refs, handler]);
};

// Hook para Dark Mode
const useDarkMode = () => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'auto';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (selectedTheme) => {
      root.classList.remove('dark');
      
      if (selectedTheme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          root.classList.add('dark');
        }
      } else if (selectedTheme === 'dark') {
        root.classList.add('dark');
      }
    };

    applyTheme(theme);
    localStorage.setItem('theme', theme);

    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('auto');
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  return { theme, setTheme };
};

// Hook para manejar los pesos
const useWeights = (initialSize = 60) => {
  const [weights, setWeights] = useState(Array(initialSize).fill(''));
  const [numUnidades, setNumUnidades] = useState(initialSize);
  const [isLoadedFromHistory, setIsLoadedFromHistory] = useState(false);
  const [backupWeights, setBackupWeights] = useState(null);
  const [backupNumUnidades, setBackupNumUnidades] = useState(null);

  const updateWeight = (index, value) => {
    const newWeights = [...weights];
    newWeights[index] = value;
    setWeights(newWeights);
  };

  const updateSize = (newSize) => {
    const size = parseInt(newSize);
    
    if (newSize === '' || newSize === '0') {
      setNumUnidades('');
      return;
    }
    
    if (isNaN(size) || size < 1) {
      return;
    }
    
    const finalSize = Math.min(size, 200);
    setNumUnidades(finalSize);
    
    if (!isLoadedFromHistory) {
      setWeights(Array(finalSize).fill(''));
    }
  };

  const clearWeights = () => {
    setWeights(Array(numUnidades).fill(''));
    setIsLoadedFromHistory(false);
    setBackupWeights(null);
    setBackupNumUnidades(null);
  };

  const getValidWeights = () => {
    return weights
      .filter(w => w !== '' &&  w !== ' ' && w !== '0.00' && w !== 0 && !isNaN(parseFloat(w)))
      .map(w => parseFloat(w))
      //.sort((a, b) => a - b);
  };

  const exportWeightsToText = () => {
    let textoExportado = '';
    const columnas = 3;

    const newWeights = weights
      .filter(w => w !== '' &&  w !== ' ' && w !== '0.00' && w !== 0 && !isNaN(parseFloat(w)))
      .map(w => parseFloat(w))

    if (newWeights.length === 0) {
      return { success: false, count: 0, text: '' };
    }
    
    newWeights.forEach((peso, index) => {
      textoExportado += peso + ' ';

      // Salto de línea cada 3 elementos
      if ((index + 1) % columnas === 0) {
          textoExportado += '\n';
      }
    });

    // Eliminar el espacio o salto de línea final sobrante
    const textoFinal = textoExportado.trim();
    return { success: true, count: newWeights.length, text: textoFinal };
  }


  const importWeightsFromText = (text) => {
    const numbers = text
      .split(/[\s;]+/)
      .map(s => s.trim())
      .map(s => s.replace(',', '.'))
      .filter(s => s !== '' && !isNaN(parseFloat(s)))
      .map(s => parseFloat(s).toFixed(2));

    if (numbers.length === 0) {
      return { success: false, count: 0 };
    }

    if (numbers.length > numUnidades) {
      setNumUnidades(numbers.length);
    }

    const newWeights = Array(Math.max(numbers.length, numUnidades)).fill('');
    numbers.forEach((num, idx) => {
      newWeights[idx] = num;
    });

    setWeights(newWeights);
    setIsLoadedFromHistory(false);
    return { success: true, count: numbers.length };
  };

  const loadWeights = (loadedWeights, size) => {
    setNumUnidades(size);
    setWeights([...loadedWeights]);
    setIsLoadedFromHistory(true);
    setBackupWeights(null);
    setBackupNumUnidades(null);
  };

  const optimizeUniformity = (targetUni) => {
    // 1. LIMPIEZA
    const validData = weights
      .map((w, idx) => {
        const cleanVal = typeof w === 'string' ? w.replace(',', '.') : w;
        return { val: parseFloat(cleanVal), idx };
      })
      .filter(item => !isNaN(item.val));

    if (validData.length < 3) return { success: false, message: "Datos insuficientes." };

    // 2. VALIDACIÓN DE PARIDAD
    const hasImpares = validData.some(item => Math.round(item.val * 100) % 2 !== 0);
    if (hasImpares) return { success: false, message: "Hay pesos impares. Use múltiplos de 0.02." };

    // 3. BACKUP (Corregido para asegurar persistencia)
    if (!backupWeights || backupWeights.length === 0) {
      console.log("Creando backup de pesos originales...");
      setBackupWeights([...weights]);
      setBackupNumUnidades(numUnidades);
      console.log("Backup creado:", [...weights]);
      // Nota: console.log(backupWeights) seguirá dando null aquí por asincronía, 
      // pero weightsCopy tiene los datos.
    }

    let tempWeights = validData.map(d => d.val);
    const n = tempWeights.length;
    const sumaOriginal = tempWeights.reduce((a, b) => a + b, 0);
    const promedio = sumaOriginal / n;
    const rMin = promedio * 0.9;
    const rMax = promedio * 1.1;

    const initialUni = (tempWeights.filter(w => w >= rMin && w <= rMax).length / n) * 100;
    const pollosObjetivo = Math.round((targetUni * n) / 100);
    const roundToEven = (val) => Math.round(val * 50) / 50;

    // 4. OPTIMIZACIÓN (Tomando de ambos extremos: abajo y arriba)
    let iterations = 0;
    let modifiedIndices = new Set();

    while (iterations < 300) {
      let indicesIn = [];
      let indicesBajo = []; // < 10%
      let indicesAlto = []; // > 10%

      tempWeights.forEach((w, i) => {
        if (w >= rMin && w <= rMax) indicesIn.push(i);
        else if (w < rMin) indicesBajo.push(i);
        else indicesAlto.push(i);
      });

      if (indicesIn.length === pollosObjetivo) break;

      if (indicesIn.length < pollosObjetivo) {
        // METER AL RANGO: Alternamos entre el más bajo y el más alto
        let targetIdx = indicesBajo.length > 0 ? indicesBajo[0] : indicesAlto[0];
        tempWeights[targetIdx] = roundToEven(promedio);
        modifiedIndices.add(targetIdx);
      } else {
        // SACAR DEL RANGO: Empujamos hacia afuera alternando extremos
        let targetIdx = indicesIn[0];
        tempWeights[targetIdx] = iterations % 2 === 0 ? roundToEven(rMin - 0.04) : roundToEven(rMax + 0.04);
        modifiedIndices.add(targetIdx);
      }
      iterations++;
    }

    // 5. BALANCEO DE PROMEDIO
    let diff = sumaOriginal - tempWeights.reduce((a, b) => a + b, 0);
    let safety = 0;
    while (Math.abs(diff) > 0.001 && safety < 500) {
      for (let i = 0; i < n && Math.abs(diff) > 0.001; i++) {
        const step = diff > 0 ? 0.02 : -0.02;
        const newVal = roundToEven(tempWeights[i] + step);
        if ((tempWeights[i] >= rMin && tempWeights[i] <= rMax) === (newVal >= rMin && newVal <= rMax)) {
          tempWeights[i] = newVal;
          modifiedIndices.add(i);
          diff = parseFloat((diff - step).toFixed(10));
        }
      }
      safety++;
    }

    // 6. SHUFFLE (Algoritmo Fisher-Yates para desordenar)
    for (let i = tempWeights.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tempWeights[i], tempWeights[j]] = [tempWeights[j], tempWeights[i]];
    }

    // 7. MAPEO FINAL
    const finalWeightsStrings = tempWeights.map(v => v.toFixed(2));
    setWeights(finalWeightsStrings);

    const finalUni = (tempWeights.filter(w => w >= rMin && w <= rMax).length / n) * 100;

    return { 
      success: true, 
      message: `Uniformidad: ${initialUni.toFixed(1)}% → ${finalUni.toFixed(1)}%. Se desordenaron y ajustaron ${modifiedIndices.size} pesos.`,
      adjustedCount: modifiedIndices.size,
      uniOptimize: finalUni
    };
  };

const handleFillWeights = (targetAvg, range, totalPollos) => {
  const cleanAvg = parseFloat(targetAvg.toString().replace(',', '.'));
  const sumaTotalObjetivo = parseFloat((cleanAvg * totalPollos).toFixed(2));
  const roundToEven = (val) => Math.round(val * 50) / 50;

  // Definimos el rango de 400g - 500g
  const cleanRange = parseFloat(range.toString().replace(',', '.'));
  const spread = cleanRange + (Math.random() * 0.10);
  const minAbs = roundToEven(cleanAvg - (spread / 2));
  const maxAbs = roundToEven(minAbs + spread);

  let tempWeights = [];

  // Paso 1: Llenar con valores aleatorios puros dentro del rango
  for (let i = 0; i < totalPollos; i++) {
    const randomVal = minAbs + Math.random() * (maxAbs - minAbs);
    tempWeights.push(roundToEven(randomVal));
  }

  // Paso 2: Ajuste fino para clavar el promedio (3 decimales)
  let sumaActual = tempWeights.reduce((a, b) => a + b, 0);
  let diff = parseFloat((sumaTotalObjetivo - sumaActual).toFixed(10));
  let safety = 0;

  while (Math.abs(diff) > 0.001 && safety < 2000) {
    for (let i = 0; i < totalPollos && Math.abs(diff) > 0.001; i++) {
      const step = diff > 0 ? 0.02 : -0.02;
      const newVal = roundToEven(tempWeights[i] + step);

      // Solo ajustamos si no nos salimos del rango 400-500g
      if (newVal >= minAbs && newVal <= maxAbs) {
        tempWeights[i] = newVal;
        diff = parseFloat((diff - step).toFixed(10));
      }
    }
    safety++;
  }

  setWeights(tempWeights.map(v => v.toFixed(2)));

  return {
    success: true,
    message: `Promedio: ${cleanAvg.toFixed(3)} | Rango: ${((maxAbs - minAbs) * 1000).toFixed(0)}g`
  };
};

  const restoreBackup = () => {
    if (backupWeights) {
      setWeights([...backupWeights]);
      setNumUnidades(backupNumUnidades);
      setBackupWeights(null);
      setBackupNumUnidades(null);
      return { success: true, message: 'Pesos originales restaurados' };
    }
    return { success: false, message: 'No hay backup disponible' };
  };

  const discardBackup = () => {
    setBackupWeights(null);
    setBackupNumUnidades(null);
  };

  return {
    weights,
    numUnidades,
    updateWeight,
    updateSize,
    clearWeights,
    getValidWeights,
    setWeights,
    importWeightsFromText,
    exportWeightsToText,
    loadWeights,
    isLoadedFromHistory,
    optimizeUniformity,
    handleFillWeights,
    backupWeights,
    restoreBackup,
    discardBackup
  };
};

// Hook para análisis estadístico
const useAnalysis = (getValidWeights) => {
  const calculateAnalysis = () => {
    const validWeights = getValidWeights().sort((a, b) => a - b);
    
    if (validWeights.length === 0) return null;

    const n = validWeights.length;
    const min = validWeights[0];
    const max = validWeights[n - 1];
    const rango = max - min;
    const promedio = validWeights.reduce((sum, w) => sum + w, 0) / n;
    
    const mediana = n % 2 === 0
      ? (validWeights[n / 2 - 1] + validWeights[n / 2]) / 2
      : validWeights[Math.floor(n / 2)];

    const varianza = validWeights.reduce((sum, w) => sum + Math.pow(w - promedio, 2), 0) / (n - 1);
    const desviacion = Math.sqrt(varianza);
    const cv = (desviacion / promedio) * 100;

    const rango10 = promedio * 0.1;
    const min10 = promedio - rango10;
    const max10 = promedio + rango10;

    const avesDentroRango = validWeights.filter(w => w >= min10 && w <= max10).length;
    const avesDebajoRango = validWeights.filter(w => w < min10).length;
    const avesEncimaRango = validWeights.filter(w => w > max10).length;
    const uniformidad = (avesDentroRango / n) * 100;

    return {
      pesoMinimo: min,
      pesoMaximo: max,
      rango,
      promedio,
      mediana,
      desviacion,
      cv,
      rango10,
      min10,
      max10,
      avesDentroRango,
      uniformidad,
      avesDebajoRango,
      avesEncimaRango,
      totalAves: n
    };
  };

  return { calculateAnalysis };
};

// Hook para gestión de registros
const useRecords = () => {
  const [registros, setRegistros] = useState(() => {
    const saved = localStorage.getItem('poultryRecords');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('poultryRecords', JSON.stringify(registros));
  }, [registros]);

  const saveRecord = (corral, sex, edad, numUnidades, weights, analysis, isUpdate = false, recordId = null) => {
    if (!analysis) {
      return { success: false, message: 'Por favor ingresa datos válidos antes de guardar' };
    }

    if (isUpdate && recordId) {
      const updatedRegistros = registros.map(r => 
        r.id === recordId 
          ? {
              ...r,
              fecha: new Date().toLocaleString('es-PE'),
              corral,
              sex,
              edad: parseInt(edad),
              numUnidades,
              weights: [...weights],
              analysis: { ...analysis }
            }
          : r
      );
      setRegistros(updatedRegistros);
      return { success: true, message: 'Registro actualizado exitosamente' };
    } else {
      const newRecord = {
        id: Date.now(),
        fecha: new Date().toLocaleString('es-PE'),
        corral,
        sex,
        edad: parseInt(edad),
        numUnidades,
        weights: [...weights],
        analysis: { ...analysis }
      };
      setRegistros([newRecord, ...registros]);
      return { success: true, message: 'Registro guardado exitosamente' };
    }
  };

  const deleteRecord = (id) => {
    setRegistros(registros.filter(r => r.id !== id));
    return true;
  };

  const importRecords = (newRecords) => {
    setRegistros(newRecords);
    return { success: true, message: `${newRecords.length} registros importados exitosamente` };
  };

  const getRecordsByCorral = (corral) => {
    return registros
      .filter(r => r.corral === corral)
      .sort((a, b) => a.edad - b.edad);
  };

  return {
    registros,
    saveRecord,
    deleteRecord,
    importRecords,
    getRecordsByCorral
  };
};

// ==================== UTILIDADES ====================

const exportUtils = {
  exportToCSV: (corral, sex, edad, analysis, validWeights) => {
    if (!analysis) {
      return { success: false, message: 'No hay datos para exportar' };
    }

    let csv = 'Registro de Pesos de Pollos\n\n';
    csv += `Corral:,${corral}\n`;
    csv += `Sexo:,${sex}\n`;
    csv += `Edad:,${edad} días\n`;
    csv += `Fecha:,${new Date().toLocaleString('es-PE')}\n`;
    csv += `Total Unidades:,${analysis.totalAves}\n\n`;
    
    csv += 'ANÁLISIS DE DATOS\n';
    csv += `Peso Mínimo (kg):,${analysis.pesoMinimo.toFixed(3)}\n`;
    csv += `Peso Máximo (kg):,${analysis.pesoMaximo.toFixed(3)}\n`;
    csv += `Rango (kg):,${analysis.rango.toFixed(3)}\n`;
    csv += `Promedio (kg):,${analysis.promedio.toFixed(3)}\n`;
    csv += `Mediana (kg):,${analysis.mediana.toFixed(3)}\n`;
    csv += `Desviación Estándar:,${analysis.desviacion.toFixed(3)}\n`;
    csv += `Coef. Variación (%):,${analysis.cv.toFixed(1)}\n`;
    csv += `Rango ±10% (kg):,${analysis.rango10.toFixed(3)}\n`;
    csv += `Mín -10% (kg):,${analysis.min10.toFixed(3)}\n`;
    csv += `Máx +10% (kg):,${analysis.max10.toFixed(3)}\n`;
    csv += `Aves dentro rango:,${analysis.avesDentroRango}\n`;
    csv += `Uniformidad (%):,${analysis.uniformidad.toFixed(1)}\n`;
    csv += `Aves debajo rango:,${analysis.avesDebajoRango}\n`;
    csv += `Aves encima rango:,${analysis.avesEncimaRango}\n\n`;
    
    csv += 'PESOS REGISTRADOS (kg)\n';
    validWeights.forEach((w, i) => {
      csv += `${i + 1},${w}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `registro_pesos_${corral}_${edad}dias_${Date.now()}.csv`;
    link.click();
    return { success: true, message: 'Archivo CSV exportado exitosamente' };
  },

  exportAllToCSV: (registros) => {
    if (registros.length === 0) {
      return { success: false, message: 'No hay registros históricos para exportar' };
    }

    let csv = 'HISTORIAL DE REGISTROS DE PESOS\n\n';
    csv += 'Fecha,Corral,Sexo,Edad (días),Total Aves,Promedio (kg),Uniformidad (%),CV (%),Mín (kg),Máx (kg)\n';
    
    registros.forEach(r => {
      csv += `${r.fecha},${r.corral},${r.sex},${r.edad},${r.analysis.totalAves},${r.analysis.promedio.toFixed(3)},${r.analysis.uniformidad.toFixed(1)},${r.analysis.cv.toFixed(1)},${r.analysis.pesoMinimo.toFixed(3)},${r.analysis.pesoMaximo.toFixed(3)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historial_completo_${Date.now()}.csv`;
    link.click();
    return { success: true, message: 'Historial exportado exitosamente' };
  },

  exportAllToJSON: (registros) => {
    if (registros.length === 0) {
      return { success: false, message: 'No hay registros históricos para exportar' };
    }

    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      totalRecords: registros.length,
      records: registros
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `backup_completo_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    return { success: true, message: 'Backup JSON exportado exitosamente' };
  },

  exportAllToCSVBackup: (registros) => {
    if (registros.length === 0) {
      return { success: false, message: 'No hay registros para exportar' };
    }

    let csv = 'ID,Fecha,Corral,Sexo,Edad,NumUnidades,TotalAves,Promedio,Mediana,Uniformidad,CV,PesoMin,PesoMax,Rango,Desviacion,Rango10,Min10,Max10,AvesDentro,AvesDebajo,AvesEncima,Pesos\n';
    
    registros.forEach(r => {
      const weights = r.weights.filter(w => w !== '').join(';');
      csv += `${r.id},"${r.fecha}",${r.corral},${r.sex},${r.edad},${r.numUnidades},${r.analysis.totalAves},`;
      csv += `${r.analysis.promedio.toFixed(3)},${r.analysis.mediana.toFixed(3)},${r.analysis.uniformidad.toFixed(1)},`;
      csv += `${r.analysis.cv.toFixed(1)},${r.analysis.pesoMinimo.toFixed(3)},${r.analysis.pesoMaximo.toFixed(3)},`;
      csv += `${r.analysis.rango.toFixed(3)},${r.analysis.desviacion.toFixed(3)},${r.analysis.rango10.toFixed(3)},`;
      csv += `${r.analysis.min10.toFixed(3)},${r.analysis.max10.toFixed(3)},${r.analysis.avesDentroRango},`;
      csv += `${r.analysis.avesDebajoRango},${r.analysis.avesEncimaRango},"${weights}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `backup_registros_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    return { success: true, message: 'Backup CSV exportado exitosamente' };
  },

  exportToExcel: (corral, sex, edad, analysis, validWeights) => {
    if (!analysis) {
      return { success: false, message: 'No hay datos para exportar' };
    }

    // Crear HTML que Excel puede importar
    let html = `
      <html xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="UTF-8">
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Registro de Pesos</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
      </head>
      <body>
        <table border="1">
          <tr><td colspan="4" style="background-color: #4CAF50; color: white; font-weight: bold; font-size: 16px; text-align:center;">REGISTRO DE PESOS DE POLLOS</td></tr>
          <tr><td><b>Fecha</b></td><td colspan="3">${new Date().toLocaleString('es-PE')}</td></tr>
          <tr><td><b>Corral</b></td><td colspan="3">${corral}</td></tr>
          <tr><td><b>Sexo</b></td><td colspan="3">${sex}</td></tr>
          <tr><td><b>Edad</b></td><td colspan="3">${edad} días</td></tr>
          <tr><td><b>Total Unidades</b></td><td colspan="3">${analysis.totalAves}</td></tr>
          
          <tr><td colspan="4" style="background-color: #2196F3; color: white; font-weight: bold; text-align:center;">ANÁLISIS ESTADÍSTICO</td></tr>
          <tr><td>Peso Mínimo (kg)</td><td colspan="3">${analysis.pesoMinimo.toFixed(3)}</td></tr>
          <tr><td>Peso Máximo (kg)</td><td colspan="3">${analysis.pesoMaximo.toFixed(3)}</td></tr>
          <tr><td>Rango (kg)</td><td colspan="3">${analysis.rango.toFixed(3)}</td></tr>
          <tr><td style="background-color: #E8F5E9;"><b>Promedio (kg)</b></td><td colspan="3" style="background-color: #E8F5E9;"><b>${analysis.promedio.toFixed(3)}</b></td></tr>
          <tr><td>Mediana (kg)</td><td colspan="3">${analysis.mediana.toFixed(3)}</td></tr>
          <tr><td>Desviación Estándar (kg)</td><td colspan="3">${analysis.desviacion.toFixed(3)}</td></tr>
          <tr><td>Coef. Variación (%)</td><td colspan="3">${analysis.cv.toFixed(1)}</td></tr>
          
          <tr><td colspan="4" style="background-color: #FF9800; color: white; font-weight: bold; text-align:center;">UNIFORMIDAD ±10%</td></tr>
          <tr><td>Rango ±10% (kg)</td><td colspan="3">${analysis.rango10.toFixed(3)}</td></tr>
          <tr><td>Mínimo -10% (kg)</td><td colspan="3">${analysis.min10.toFixed(3)}</td></tr>
          <tr><td>Máximo +10% (kg)</td><td colspan="3">${analysis.max10.toFixed(3)}</td></tr>
          <tr><td>Aves dentro del rango</td><td colspan="3">${analysis.avesDentroRango}</td></tr>
          <tr>
            <td style="background-color: ${analysis.uniformidad >= 75 ? '#C8E6C9' : analysis.uniformidad >= 50 ? '#FFE0B2' : '#FFCDD2'};"><b>Uniformidad (%)</b></td>
            <td colspan="3" style="background-color: ${analysis.uniformidad >= 75 ? '#C8E6C9' : analysis.uniformidad >= 50 ? '#FFE0B2' : '#FFCDD2'};"><b>${analysis.uniformidad.toFixed(1)}</b></td>
          </tr>
          <tr><td>Aves debajo del rango</td><td colspan="3">${analysis.avesDebajoRango}</td></tr>
          <tr><td>Aves encima del rango</td><td colspan="3">${analysis.avesEncimaRango}</td></tr>
          
          <tr style="color: white; font-weight: bold; text-align:center;">
            <td style="background-color: #9C27B0;">N°</td><td colspan="3" style="background-color: #9C27B0;">Pesos (kg)</td>
          </tr>`;
    
    /* 
          <tr style="background-color: #9C27B0; color: white; font-weight: bold;">
            <td>N°</td><td>Peso (kg)</td><td>Estado</td>
          </tr>`;
    
    validWeights.forEach((w, i) => {
      const estado = w >= analysis.min10 && w <= analysis.max10 ? 'Dentro rango' : 
                     w < analysis.min10 ? 'Debajo' : 'Encima';
      const color = w >= analysis.min10 && w <= analysis.max10 ? '#E8F5E9' : 
                    w < analysis.min10 ? '#FFEBEE' : '#E3F2FD';
      html += `<tr style="background-color: ${color};"><td>${i + 1}</td><td>${w.toFixed(3)}</td><td>${estado}</td></tr>`;
    }); 
    
    */
    
    console.log(validWeights)

    for (let i = 0; i < (validWeights.length / 3); i++) {
      const w0 = validWeights[i * 3 + 0]
      const w1 = validWeights[i * 3 + 1]
      const w2 = validWeights[i * 3 + 2]

      const color0 = w0 >= analysis.min10 && 
              w0 <= analysis.max10 ? '#E8F5E9' : 
              w0 < analysis.min10 ? '#FFEBEE' : '#E3F2FD';
      const color1 = w1 >= analysis.min10 && 
              w1 <= analysis.max10 ? '#E8F5E9' : 
              w1 < analysis.min10 ? '#FFEBEE' : '#E3F2FD';
      const color2 = w2 >= analysis.min10 && 
              w2 <= analysis.max10 ? '#E8F5E9' : 
              w2 < analysis.min10 ? '#FFEBEE' : '#E3F2FD';

      html += `<tr>
        <td style="text-align:center;">${i + 1}</td>
        <td style="background-color: ${color0};">${w0.toFixed(2)}</td>
        <td style="background-color: ${color1};">${w1.toFixed(2)}</td>
        <td style="background-color: ${color2};">${w2.toFixed(2)}</td>
      </tr>`;
    }
    
    html += `</table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `registro_pesos_${corral}_${edad}dias_${Date.now()}.xls`;
    link.click();
    URL.revokeObjectURL(link.href);
    return { success: true, message: 'Archivo Excel exportado exitosamente' };
  },

  exportToPDF: (corral, sex, edad, analysis, validWeights) => {
    if (!analysis) {
      return { success: false, message: 'No hay datos para exportar' };
    }

    // Crear HTML optimizado para imprimir como PDF
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: Arial, sans-serif; font-size: 11pt; }
          .header { text-align: center; background: #4CAF50; color: white; padding: 15px; margin-bottom: 20px; }
          .info-box { background: #f5f5f5; padding: 10px; margin-bottom: 15px; border-left: 4px solid #2196F3; }
          .section-title { background: #2196F3; color: white; padding: 8px; margin-top: 15px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #9C27B0; color: white; }
          .highlight { background-color: #E8F5E9; font-weight: bold; }
          .warning { background-color: #FFEBEE; }
          .good { background-color: #E8F5E9; }
          .footer { margin-top: 30px; text-align: center; font-size: 9pt; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>REGISTRO DE PESOS DE POLLOS</h1>
          <p>Sistema de Control de Peso y Uniformidad</p>
        </div>
        
        <div class="info-box">
          <table style="border: none;">
            <colgroup>
              <col style="width: 50%;">
              <col style="width: 50%;">
            </colgroup>
            <tr style="border: none;">
              <td style="border: none;"><b>Fecha:</b> ${new Date().toLocaleString('es-PE')}</td>
              <td style="border: none;"><b>Corral:</b> ${corral} - ${sex}</td>
            </tr>
            <tr style="border: none;">
              <td style="border: none;"><b>Total Aves:</b> ${analysis.totalAves}</td>
              <td style="border: none;"><b>Edad:</b> ${edad} días</td>
            </tr>
          </table>
        </div>

        <div class="section-title">ANÁLISIS ESTADÍSTICO</div>
        <table>
          <colgroup>
            <col style="width: 50%;">
            <col style="width: 50%;">
          </colgroup>
          <tr><td>Peso Mínimo (kg)</td><td>${analysis.pesoMinimo.toFixed(3)}</td></tr>
          <tr><td>Peso Máximo (kg)</td><td>${analysis.pesoMaximo.toFixed(3)}</td></tr>
          <tr><td>Rango (kg)</td><td>${analysis.rango.toFixed(3)}</td></tr>
          <tr class="highlight"><td><b>Promedio (kg)</b></td><td><b>${analysis.promedio.toFixed(3)}</b></td></tr>
          <tr><td>Mediana (kg)</td><td>${analysis.mediana.toFixed(3)}</td></tr>
          <tr><td>Desviación Estándar</td><td>${analysis.desviacion.toFixed(3)}</td></tr>
          <tr><td>Coef. Variación (%)</td><td>${analysis.cv.toFixed(1)}</td></tr>
        </table>

        <div class="section-title">UNIFORMIDAD ±10%</div>
        <table>
          <colgroup>
            <col style="width: 50%;">
            <col style="width: 50%;">
          </colgroup>
          <tr><td>Rango ±10% (kg)</td><td>${analysis.rango10.toFixed(3)}</td></tr>
          <tr><td>Mínimo -10% (kg)</td><td>${analysis.min10.toFixed(3)}</td></tr>
          <tr><td>Máximo +10% (kg)</td><td>${analysis.max10.toFixed(3)}</td></tr>
          <tr><td>Aves dentro del rango</td><td>${analysis.avesDentroRango} (${((analysis.avesDentroRango/analysis.totalAves)*100).toFixed(1)}%)</td></tr>
          <tr class="${analysis.uniformidad >= 75 ? 'good' : 'warning'}">
            <td><b>Uniformidad (%)</b></td><td><b>${analysis.uniformidad.toFixed(1)}%</b></td>
          </tr>
          <tr><td>Aves debajo del rango</td><td>${analysis.avesDebajoRango} (${((analysis.avesDebajoRango/analysis.totalAves)*100).toFixed(1)}%)</td></tr>
          <tr><td>Aves encima del rango</td><td>${analysis.avesEncimaRango} (${((analysis.avesEncimaRango/analysis.totalAves)*100).toFixed(1)}%)</td></tr>
        </table>

        <div class="section-title">TABLA DE PESOS REGISTRADOS</div>
        <table>
          <colgroup>
            <col style="width: 10%;">
            <col style="width: 30%;">
            <col style="width: 30%;">
            <col style="width: 30%;">
          </colgroup>
          <thead>
            <tr>
              <th style="text-align:center;">N°</th>
              <th colspan="3" style="text-align:center;">Pesos (kg)</th>
            </tr>
          </thead>
          <tbody>`;

    /* 
            <tr>
              <th>N°</th><th>Peso (kg)</th><th>Estado</th>
              <th>N°</th><th>Peso (kg)</th><th>Estado</th>
              <th>N°</th><th>Peso (kg)</th><th>Estado</th>
            </tr>
    */
    
    // Dividir en 3 columnas
    /* for (let i = 0; i < validWeights.length; i += 3) {
      html += '<tr>';
      for (let j = 0; j < 3; j++) {
        const idx = i + j;
        if (idx < validWeights.length) {
          const w = validWeights[idx];
          const estado = w >= analysis.min10 && w <= analysis.max10 ? '✓' : 
                        w < analysis.min10 ? '↓' : '↑';
          const className = w >= analysis.min10 && w <= analysis.max10 ? 'good' : 'warning';
          html += `<td>${idx + 1}</td><td>${w.toFixed(3)}</td><td class="${className}">${estado}</td>`;
        } else {
          html += '<td></td><td></td><td></td>';
        }
      }
      html += '</tr>';
    } */

    const getColor = (weight) => {
      if (weight >= analysis.min10 && weight <= analysis.max10) {
        return '#E8F5E9';
      }
      if (weight < analysis.min10) {
        return '#FFEBEE';
      }
      return '#E3F2FD';
    };

    console.log(validWeights);

    for (let i = 0; i < validWeights.length; i += 3) {
      const w0 = validWeights[i];
      const w1 = validWeights[i + 1];
      const w2 = validWeights[i + 2];

      /* const color0 = getColor(w0, analysis);
      const color1 = getColor(w1, analysis);
      const color2 = getColor(w2, analysis); */

      const estado0 = w0 >= analysis.min10 && 
                      w0 <= analysis.max10 ? '✓' : 
                      w0 < analysis.min10 ? '↓' : '↑';
      const estado1 = w1 >= analysis.min10 && 
                      w1 <= analysis.max10 ? '✓' : 
                      w1 < analysis.min10 ? '↓' : '↑';
      const estado2 = w2 >= analysis.min10 && 
                      w2 <= analysis.max10 ? '✓' : 
                      w2 < analysis.min10 ? '↓' : '↑';

      const className0 = w0 >= analysis.min10 && w0 <= analysis.max10 ? 'green' : 'red';
      const className1 = w1 >= analysis.min10 && w1 <= analysis.max10 ? 'green' : 'red';
      const className2 = w2 >= analysis.min10 && w2 <= analysis.max10 ? 'green' : 'red';

      html += `<tr>
        <td style="text-align:center;">${(i / 3) + 1}</td>
        <td style="position:relative;">${w0?.toFixed(2) ?? ''} <span style="position:absolute; right:20px; color:${className0}">${w0!==undefined ? estado0 : ''}</span></td>
        <td style="position:relative;">${w1?.toFixed(2) ?? ''} <span style="position:absolute; right:20px; color:${className1}">${w1!==undefined ? estado1 : ''}</span></td>
        <td style="position:relative;">${w2?.toFixed(2) ?? ''} <span style="position:absolute; right:20px; color:${className2}">${w2!==undefined ? estado2 : ''}</span></td>
      </tr>`;
    }
    
    html += `
          </tbody>
        </table>
        
        <div class="footer">
          <p>Generado el ${new Date().toLocaleString('es-PE')}</p>
          <p>Sistema de Registro de Pesos de Pollos v1.0</p>
        </div>
      </body>
      </html>`;

    // Abrir en nueva ventana para imprimir
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Esperar a que cargue y abrir diálogo de impresión
    setTimeout(() => {
      printWindow.print();
    }, 250);
    
    return { success: true, message: 'PDF listo para imprimir (Ctrl+P o Guardar como PDF)' };
  },

  importFromJSON: (file) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('Sin archivo'));
        return;
      }

      // Crear URL del blob - más estable en móviles
      const url = URL.createObjectURL(file);
      
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error('Error al leer archivo');
          }
          return response.text();
        })
        .then(text => {
          URL.revokeObjectURL(url); // Limpiar memoria
          
          if (!text || text.trim() === '') {
            reject(new Error('Archivo vacío'));
            return;
          }

          const data = JSON.parse(text);
          
          if (!data?.records?.length) {
            reject(new Error('Sin registros'));
            return;
          }

          const valid = data.records.filter(r => r?.id && r?.corral);

          if (!valid.length) {
            reject(new Error('Sin registros válidos'));
            return;
          }

          resolve(valid);
        })
        .catch(error => {
          URL.revokeObjectURL(url);
          if (error instanceof SyntaxError) {
            reject(new Error('JSON inválido'));
          } else {
            reject(new Error(error.message || 'Error al importar'));
          }
        });
    });
  },

  importFromCSV: (file) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('Sin archivo'));
        return;
      }

      const url = URL.createObjectURL(file);
      
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error('Error al leer archivo');
          }
          return response.text();
        })
        .then(text => {
          URL.revokeObjectURL(url);
          
          if (!text || text.trim() === '') {
            reject(new Error('Archivo vacío'));
            return;
          }

          const lines = text.split('\n').filter(line => line.trim());
          
          // Verificar encabezado
          if (!lines[0] || !lines[0].includes('ID,Fecha,Corral')) {
            reject(new Error('Formato CSV inválido'));
            return;
          }

          const records = [];
          
          // Procesar cada línea (saltando el encabezado)
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const values = [];
            let current = '';
            let inQuotes = false;
            
            // Parser CSV que maneja comillas
            for (let char of line) {
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
              } else {
                current += char;
              }
            }
            values.push(current);

            // Verificar que tenga suficientes columnas
            if (values.length >= 22) {
              try {
                const weightsStr = values[21].replace(/"/g, '');
                const weightsArray = weightsStr.split(';').filter(w => w.trim());
                
                const record = {
                  id: parseInt(values[0]),
                  fecha: values[1].replace(/"/g, ''),
                  corral: values[2],
                  sex: values[3],
                  edad: parseInt(values[4]),
                  numUnidades: parseInt(values[5]),
                  weights: weightsArray,
                  analysis: {
                    totalAves: parseInt(values[6]),
                    promedio: parseFloat(values[7]),
                    mediana: parseFloat(values[8]),
                    uniformidad: parseFloat(values[9]),
                    cv: parseFloat(values[10]),
                    pesoMinimo: parseFloat(values[11]),
                    pesoMaximo: parseFloat(values[12]),
                    rango: parseFloat(values[13]),
                    desviacion: parseFloat(values[14]),
                    rango10: parseFloat(values[15]),
                    min10: parseFloat(values[16]),
                    max10: parseFloat(values[17]),
                    avesDentroRango: parseInt(values[18]),
                    avesDebajoRango: parseInt(values[19]),
                    avesEncimaRango: parseInt(values[20])
                  }
                };
                
                records.push(record);
              } catch (err) {
                console.warn(`Error procesando línea ${i + 1}:`, err);
              }
            }
          }

          if (records.length === 0) {
            reject(new Error('No se encontraron registros válidos'));
            return;
          }

          resolve(records);
        })
        .catch(error => {
          URL.revokeObjectURL(url);
          reject(new Error(error.message || 'Error al importar CSV'));
        });
    });
  }
};

// ==================== COMPONENTES ====================

// Sistema de Notificaciones
const Toast = ({ message, type = 'info', onClose }) => {
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(onClose, 3000);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [onClose]);

  const types = {
    success: 'bg-green-100 dark:bg-green-800 border-green-300 dark:border-green-600 text-green-900 dark:text-green-100',
    error: 'bg-red-100 dark:bg-red-800 border-red-300 dark:border-red-600 text-red-900 dark:text-red-100',
    warning: 'bg-yellow-100 dark:bg-yellow-800 border-yellow-300 dark:border-yellow-600 text-yellow-900 dark:text-yellow-100',
    info: 'bg-blue-100 dark:bg-blue-800 border-blue-300 dark:border-blue-600 text-blue-900 dark:text-blue-100'
  };

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return (
    <div className={`fixed top-0 right-0 z-[100] max-w-full m-2 sm:m-4 ${types[type]} border-2 rounded-lg shadow-xl p-4 animate-slide-in`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icons[type]}</span>
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button onClick={onClose} className="opacity-70 hover:opacity-100 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const timeoutsRef = useRef({});

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    
    // Limpiar cualquier timeout anterior del mismo mensaje
    Object.keys(timeoutsRef.current).forEach(key => {
      const toast = JSON.parse(key);
      if (toast.message === message && toast.type === type) {
        clearTimeout(timeoutsRef.current[key]);
        delete timeoutsRef.current[key];
      }
    });
    
    // Eliminar toasts con el mismo mensaje inmediatamente
    setToasts(prev => prev.filter(t => !(t.message === message && t.type === type)));
    
    // Agregar el nuevo toast después de un pequeño delay
    setTimeout(() => {
      setToasts(prev => [...prev, { id, message, type }]);
      
      // Configurar timeout para auto-remover
      const key = JSON.stringify({ message, type });
      timeoutsRef.current[key] = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
        delete timeoutsRef.current[key];
      }, 3000);
    }, 50);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
    // Limpiar timeout asociado
    Object.keys(timeoutsRef.current).forEach(key => {
      clearTimeout(timeoutsRef.current[key]);
      delete timeoutsRef.current[key];
    });
  }, []);

  useEffect(() => {
    return () => {
      Object.values(timeoutsRef.current).forEach(clearTimeout);
      timeoutsRef.current = {};
    };
  }, []);

  const ToastContainer = useCallback(() => (
    <>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  ), [toasts, removeToast]);

  return { showToast, ToastContainer };
};

// Componente: Modal de Confirmación
const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente: Decimal Separator Switcher
const DecimalSeparatorSwitcher = React.memo(({ decimalSeparator, setDecimalSeparator }) => (
  <div className="flex gap-2 justify-center bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
    <button
      onClick={() => setDecimalSeparator('coma')}
      className={`p-1 rounded text-gray-700 dark:text-gray-300 ${decimalSeparator === 'coma' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
      title="Separador decimal: coma (0,00)"
    >
      <CommaIcon />
    </button>
    <button
      onClick={() => setDecimalSeparator('punto')}
      className={`p-1 rounded text-gray-700 dark:text-gray-300 ${decimalSeparator === 'punto' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
      title="Separador decimal: punto (0.00)"
    >
      <DotIcon />
    </button>
  </div>
));

// Componente: Theme Switcher
const ThemeSwitcher = React.memo(({ theme, setTheme }) => {
  return (
    <div className="flex gap-2 justify-center bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded ${theme === 'light' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
        title="Tema claro"
      >
        <Sun className="w-4 h-4 text-gray-700 dark:text-gray-300" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-2 rounded ${theme === 'dark' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
        title="Tema oscuro"
      >
        <Moon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
      </button>
      <button
        onClick={() => setTheme('auto')}
        className={`p-2 rounded ${theme === 'auto' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
        title="Tema del sistema"
      >
        <Monitor className="w-4 h-4 text-gray-700 dark:text-gray-300" />
      </button>
    </div>
  );
});

// Componente: Modal de Optimización de Uniformidad
const OptimizeUniformityModal = ({ isOpen, onClose, targetUni, setTargetUni, onOptimize, currentUniformity }) => {
  if (!isOpen) return null;

  const handleOptimize = () => {
    /* if (targetMin >= targetMax) {
      alert('El mínimo debe ser menor que el máximo');
      return;
    } */
    if (targetUni <= 50 || targetUni > 100) {
      alert('Los valores deben estar entre 50% y 100%');
      return;
    }
    onOptimize(targetUni);
    onClose();
  };

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div onClick={handleBackdropClick} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            <Sparkles className="w-6 h-6 inline mr-2 text-purple-600 dark:text-purple-400" />
            Optimizar Uniformidad
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg mb-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Uniformidad actual:</strong> {currentUniformity?.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {currentUniformity < targetUni ? '📈 Se aumentará la uniformidad' : '📉 Se reducirá la uniformidad'}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Uniformidad Deseada (%)
              </label>
              
              <InputNumber 
                value = {targetUni}
                onChange = {(value) => setTargetUni(value)}
                min={0}
                max={100}
                step={1}
                placeholder={0}
                //decimalSeparator={decimalSeparator}
                decimalToFixed={0}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              💡 <strong>Recomendado:</strong> 75% - 80%
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              ℹ️ El algoritmo ajustará los pesos manteniendo el promedio y las sumatorias por columna
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleOptimize}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium"
          >
            Optimizar
          </button>
        </div>
      </div>
    </div>
  );
};

const GenerateWeightsModal = ({ 
  isOpen, 
  onClose, 
  targetAvg, 
  setTargetAvg, 
  targetRange, 
  setTargetRange, 
  onGenerate,
  decimalSeparator
}) => {

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (targetAvg <= 0) {
      alert('El promedio debe ser mayor a 0');
      return;
    }
    if (targetRange <= 0) {
      alert('El rango debe ser mayor a 0');
      return;
    }
    onGenerate(targetAvg, targetRange);
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const ingresarValorAvg = (value) => {
    let valueToProcess = String(value);
    valueToProcess = valueToProcess.replace(',', '.');
    setTargetAvg(valueToProcess);
  };

  return (
    <div onClick={handleBackdropClick} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto border border-purple-500/20">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <Sparkles className="w-6 h-6 mr-2 text-purple-600 dark:text-purple-400" />
            Generar Pesos
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          {/* Info Box */}
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg mb-6 border border-purple-100 dark:border-purple-800/30">
            <p className="text-sm text-purple-800 dark:text-purple-300">
              Esta herramienta creará una lista completa de pesos que coincidan exactamente con tus metas de producción.
            </p>
          </div>

          <div className="space-y-5">
            {/* Input Promedio */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Target className="w-4 h-4 mr-2 text-blue-500" />
                Promedio Objetivo (kg)
              </label>
              
              <InputNumber 
                value = {targetAvg}
                onChange = {(value) => setTargetAvg(value)}
                min={0}
                step={0.001}
                placeholder={0.000}
                decimalSeparator={decimalSeparator}
                decimalToFixed={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Input Range */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calculator className="w-4 h-4 mr-2 text-green-500" />
                Rango aproximado (kg)
              </label>
              <InputNumber 
                value = {targetRange}
                onChange = {(value) => setTargetRange(value)}
                min={0}
                step={0.1}
                placeholder={0.000}
                decimalSeparator={decimalSeparator}
                decimalToFixed={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
              ℹ️ Se utilizará una <strong>Distribución Normal</strong> para simular la variabilidad natural del lote, asegurando que el promedio final sea exacto.
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all font-medium shadow-md"
          >
            Generar
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente: Modal de Importación
const ImportModal = ({ isOpen, onClose, onImport, showToast }) => {
  const [textInput, setTextInput] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
        transcript,
        //lastFinalTranscript, // Capturamos solo la última frase finalizada
        isListening,
        error,
        startListening,
        stopListening,
        //setTranscript    // <-- Usamos esto para limpiar la caja al añadir peso
    } = useSpeechRecognition('es-ES'); // Idioma español

    /* const [pesosRegistrados, setPesosRegistrados] = useState([]);
    const [currentPeso, setCurrentPeso] = useState(''); */

    // Sincronizar el input de texto con la transcripción del hook
    useEffect(() => {
        if (transcript) {
            setTextInput(transcript);
        }
    }, [transcript]);

    // Cuando el hook nos da una nueva frase final, la añadimos al texto existente
    /* useEffect(() => {
      if (transcript) {
          // Añade la nueva transcripción al final del valor actual, con un espacio.
          setTextInput(prevValue => {
              // Evitamos añadir espacios extra si el campo estaba vacío
              if (prevValue.trim() === '') {
                  return transcript;
              }
              return prevValue + ' ' + transcript;
          });
      }
  }, [transcript]); */ // Se ejecuta solo cuando llega una nueva transcripción final

  if (!isOpen) return null;

  /* const handleAddPeso = () => {
    const pesoNumerico = parseFloat(currentPeso.replace(',', '.'));
    
    if (!isNaN(pesoNumerico) && pesoNumerico > 0) {
        setPesosRegistrados([...pesosRegistrados, pesoNumerico]);
        setTextInput(''); // Limpiar el input después de añadir
    } else {
        alert('Por favor, introduce un peso numérico válido.');
    }
  }; */

  const toggleListening = () => {
      if (isListening) {
          stopListening();
      } else {
          startListening();
      }
  };

  const handleTextImport = () => {
    if (!textInput.trim()) {
      showToast('Por favor ingresa algunos pesos', 'warning');
      return;
    }
    const result = onImport(textInput);
    if (result.success) {
      showToast(`${result.count} pesos importados exitosamente`, 'success');
      setTextInput('');
      onClose();
    } else {
      showToast('No se encontraron números válidos en el texto', 'error');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    setIsProcessing(true);

    try {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.0/dist/tesseract.min.js';
      
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        if (!document.querySelector('script[src*="tesseract"]')) {
          document.head.appendChild(script);
        } else {
          resolve();
        }
      });

      const worker = await window.Tesseract.createWorker('eng', 1, {
        logger: m => console.log(m)
      });
      
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789.,',
        tessedit_pageseg_mode: window.Tesseract.PSM.SPARSE_TEXT,
      });
      
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      console.log('Texto OCR raw:', text);

      const lines = text.split('\n');
      const validNumbers = [];

      lines.forEach(line => {
        const numberPattern = /(\d+)[.,](\d{1,2})/g;
        let match;
        
        while ((match = numberPattern.exec(line)) !== null) {
          const intPart = match[1];
          const decPart = match[2].padEnd(2, '0');
          const number = parseFloat(`${intPart}.${decPart}`);
          
          if (number >= 0.5 && number <= 10) {
            validNumbers.push(number.toFixed(2));
          }
        }
      });

      const allText = text.replace(/[,]/g, '.').replace(/\s+/g, ' ');
      const matches = allText.match(/\d+\.\d{1,2}/g) || [];
      
      matches.forEach(match => {
        const number = parseFloat(match);
        if (number >= 0.5 && number <= 10 && !validNumbers.includes(number.toFixed(2))) {
          validNumbers.push(number.toFixed(2));
        }
      });

      console.log('Números válidos encontrados:', validNumbers);

      if (validNumbers.length > 0) {
        const numbersText = validNumbers.join(' ');
        setTextInput(numbersText);
        showToast(`OCR completado. Se encontraron ${validNumbers.length} números. Revisa y confirma antes de importar`, 'success');
      } else {
        showToast('No se encontraron números válidos en la imagen. Asegúrate de que la imagen sea clara y legible', 'error');
      }
    } catch (error) {
      showToast('Error al procesar la imagen: ' + error.message, 'error');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        
        const syntheticEvent = {
          target: {
            files: [blob]
          }
        };
        
        await handleImageUpload(syntheticEvent);
        break;
      }
    }
  };

  const handleClose = () => {
    setTextInput('');
    setImagePreview(null);
    onClose();
  };

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  return (
    <div onClick={handleBackdropClick} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              <Upload className="w-6 h-6 inline mr-2 text-blue-600 dark:text-blue-400" />
              Importar Pesos
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">Opción 1: Pegar Texto o Imagen</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Pega texto o presiona Ctrl+V para pegar una imagen capturada:
              </p>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onPaste={handlePaste}
                placeholder="Ejemplo: 2.45 2.67 2,89 3,01&#10;O presiona Ctrl+V para pegar imagen..."
                className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={toggleListening}
                className={`
                    flex items-center justify-center gap-2 mt-3 w-full px-4 py-2 rounded-lg text-white font-semibold shadow-md transition duration-300 
                    ${isListening 
                        ? 'bg-red-500 hover:bg-red-600 animate-pulse-listen' // Aplica la animación y color rojo si escucha
                        : 'bg-blue-500 hover:bg-blue-600' // Color azul normal si no escucha
                    }
                `}
                //className="mt-3 w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center justify-center gap-2"
              >
                {isListening ? (
                  <>
                    <Mic className="w-5 h-5" />
                    Detener
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    Empezar a hablar
                  </>
                )}
              </button>
              <button
                onClick={handleTextImport}
                className="mt-3 w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                Importar desde Texto
              </button>
            </div>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Camera className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">Opción 2: Subir Foto (OCR)</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Sube una foto de tu registro manual:
              </p>
              
              {imagePreview && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Vista previa:</p>
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="max-h-48 mx-auto rounded border border-gray-300 dark:border-gray-600"
                  />
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Procesando imagen...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Subir Foto
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente: Formulario de Entrada
const FormularioEntrada = React.memo(({ corral, setCorral, edad, setEdad, sex, setSex, numUnidades, onNumUnidadesChange, onSave, onUpdate, onExportCSV, onExportExcel, onExportPDF, canSave, isLoadedFromHistory }) => {
  const corrales = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B', '6A', '6B', '7A', '7B', '8A', '8B', '9A', '9B'];
  const sexos = ['Hembra', 'Macho'];
  const edades = [7, 14, 21, 28, 35, 42];
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  useClickOutside([menuRef, buttonRef], () => {
    setShowMenu(false);
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Corral</label>
        <select
          value={corral}
          onChange={(e) => setCorral(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium"
        >
          {corrales.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sexo</label>
        <select
          value={sex}
          onChange={(e) => setSex(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium"
        >
          {sexos.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Edad (días)</label>
        <select
          value={edad}
          onChange={(e) => setEdad(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium"
        >
          {edades.map(e => (
            <option key={e} value={e}>{e} días</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">N° Unidades</label>
    
        <InputNumber 
          value = {numUnidades}
          onChange = {(value) => onNumUnidadesChange(value)}
          min={1}
          //max={100}
          step={1}
          placeholder={0}
          //decimalSeparator={decimalSeparator}
          decimalToFixed={0}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium"
        />
      </div>

      <div className="flex items-end">
        <button
          onClick={isLoadedFromHistory ? onUpdate : onSave}
          disabled={!canSave}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
        >
          <Save className="w-4 h-4" />
          {isLoadedFromHistory ? 'Actualizar' : 'Guardar'}
        </button>
      </div>

      <div className="flex items-end relative">
        <button
          ref={buttonRef}
          onClick={(event) => {
            //event.stopPropagation();
            setShowMenu(!showMenu);
          }}
          disabled={!canSave}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
        >
          <Download className="w-4 h-4" /> Exportar
        </button>
        
        {showMenu && canSave && (
          <div ref={menuRef} className="absolute mb-2 top-full right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 min-w-[150px]">
            <button
              onClick={() => {
                onExportCSV();
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={() => {
                onExportExcel();
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-green-600" />
              Excel
            </button>
            <button
              onClick={() => {
                onExportPDF();
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-red-600" />
              PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

// Componente: Tabla de Pesos
const TablaPesos = ({ weights, numUnidades, onWeightChange, onClear, onImport, onExportText, onOptimize, onFillOut, decimalSeparator, targetUni, analysis, weightManager, showToast, setConfirmDialog }) => {
  const columns = 3;
  const rows = Math.ceil(numUnidades / columns);

  const columnSums = Array(columns).fill(0).map((_, colIdx) => {
    let sum = 0;
    for (let rowIdx = 0; rowIdx < rows; rowIdx++) {
      const idx = rowIdx * columns + colIdx;
      if (idx < numUnidades && weights[idx] !== '' && !isNaN(parseFloat(weights[idx]))) {
        sum += parseFloat(weights[idx]);
      }
    }
    return sum;
  });

  const totalSum = columnSums.reduce((a, b) => a + b, 0);
  const hasBackup = weightManager.backupWeights !== null;

  const esDecimalParConDosDigitos = (numero) => {
    const numeroComoCadena = numero.toFixed(2);
    const puntoDecimalIndex = numeroComoCadena.indexOf('.');
    if (puntoDecimalIndex === -1) return false;
    const parteDecimalComoCadena = numeroComoCadena.substring(puntoDecimalIndex + 1);
    const parteDecimalComoNumero = parseInt(parteDecimalComoCadena, 10);
    return parteDecimalComoNumero % 2 === 0;
  };

  const modificarValor = (idx, direccion) => {
    const currentValue = parseFloat(weights[idx]) || 0;
    const xtra = esDecimalParConDosDigitos(currentValue) ? 0 : 0.01;
    const valorStep = 0.02;
    const newValue = direccion === 'arriba' 
      ? (currentValue + valorStep - xtra).toFixed(2) 
      : Math.max(0, currentValue - valorStep + xtra).toFixed(2);
    onWeightChange(idx, newValue);
  };

  const ingresarValor = (idx, value) => {
    let valueToProcess = String(value);
    valueToProcess = valueToProcess.replace(',', '.');
    onWeightChange(idx, valueToProcess);
  };

  const handleRestoreBackup = () => {
    const result = weightManager.restoreBackup();
    showToast(result.message, result.success ? 'success' : 'warning');
  };

  const handleDiscardBackup = () => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Descartar backup?',
      message: 'No podrás recuperar los pesos originales después de descartar el backup.',
      onConfirm: () => {
        weightManager.discardBackup();
        showToast('Backup descartado', 'info');
      }
    });
  };

  const handleTextExport = () => {
    if (weights.length < 1) {
      showToast('Por favor ingresa algunos pesos', 'warning');
      return;
    }
    const result = onExportText();
    if (result.success) {
      navigator.clipboard.writeText(result.text)
      result.count > 1 ? 
        showToast(`${result.count} pesos copiados al portapapeles`, 'success') :
        showToast(`${result.count} peso copiado al portapapeles`, 'success');
    } else {
      showToast('No se encontraron pesos válidos', 'error');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
      {hasBackup && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-yellow-700 dark:text-yellow-300 text-sm font-medium text-center">
                💾 Backup disponible - Pesos originales guardados
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRestoreBackup}
                className="whitespace-nowrap px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs font-medium"
              >
                ↺ Restaurar
              </button>
              <button
                onClick={handleDiscardBackup}
                className="whitespace-nowrap px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs font-medium"
              >
                ✕ Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Edit className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Tabla de Pesos (kg)</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
              onClick={onFillOut}
              className="flex flex-auto items-center justify-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all text-sm font-medium gap-2 shadow-md"
              title="Rellenar"
            >
              <Sparkles className="w-4 h-4" />
              Rellenar
          </button>
          {analysis && (
            <button
              onClick={onOptimize}
              className="flex flex-auto items-center justify-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all text-sm font-medium gap-2 shadow-md"
              title="Optimizar uniformidad"
            >
              <Sparkles className="w-4 h-4" />
              Optimizar
            </button>
          )}
          <button
            onClick={onImport}
            className="flex flex-auto items-center justify-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium gap-2"
          >
            <Upload className="w-4 h-4" />
            Importar
          </button>
          <button
            onClick={handleTextExport}
            className="flex flex-auto items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium gap-2"
          >
            <Copy className="w-4 h-4" />
            Copiar
          </button>
          <button
            onClick={onClear}
            className="flex flex-auto items-center justify-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
          >
            Limpiar
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-sm font-semibold text-gray-800 dark:text-gray-100">N°</th>
              <th colSpan={columns} className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                Pesos
              </th>
            </tr>
          </thead>
          <tbody>
            {[...Array(rows)].map((_, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center font-medium text-gray-600 dark:text-gray-400">
                  {rowIdx + 1}
                </td>
                {[...Array(columns)].map((_, colIdx) => {
                  const idx = rowIdx * columns + colIdx;
                  if (idx >= numUnidades) {
                    return <td key={colIdx} className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900"></td>;
                  }

                  const statusRange = weights[idx] === '0.00' ? '❌' :
                                      weights[idx] >= analysis?.min10 && weights[idx] <= analysis?.max10 ? '✓' : 
                                      weights[idx] < analysis?.min10 && weights[idx] != 0 ? '↓' : 
                                      weights[idx] > analysis?.max10 ? '↑' : '';
                                      
                  const statusRangeColor = weights[idx] >= analysis?.min10 && weights[idx] <= analysis?.max10 ? 'green' : 'red';

                  const classnameColor = weights[idx] === '0.00' ?
                                        'text-red-600 dark:text-red-400' : 
                                        weights[idx] >= analysis?.min10 && weights[idx] <= analysis?.max10 ?
                                        'text-green-600 dark:text-green-400' : 
                                        weights[idx] > analysis?.max10 ?
                                        'text-blue-600 dark:text-blue-400' : 
                                        weights[idx] < analysis?.min10 && weights[idx] != 0 ? 
                                        'text-orange-600 dark:text-orange-400' : 
                                        'text-gray-900 dark:text-gray-100';

                  return (
                    <td
                      key={colIdx}
                      className="border border-gray-300 dark:border-gray-600 p-0 relative group"
                    >
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formatNumberForDisplay(weights[idx], decimalSeparator === 'coma' ? ',' : '.')}
                        onChange={(e) => ingresarValor(idx, e.target.value)}
                        className={`w-full px-2 py-2 pr-8 text-center border-none focus:ring-2 focus:ring-blue-400 focus:outline-none bg-transparent ${classnameColor} text-sm sm:text-base`}
                        placeholder={`${formatNumber(0, 2, decimalSeparator)}`}
                      />

                      {/* <input
                        type="text"
                        inputMode="decimal"
                        value={`${formatNumberForDisplay(weights[idx], decimalSeparator === 'coma' ? ',' : '.')} ${statusRange}`}
                        onChange={(e) => ingresarValor(idx, e.target.value.includes(' ') ? e.target.value.split(' ')[0] : e.target.value)}
                        className={`w-full px-2 py-2 pr-8 text-center border-none focus:ring-2 focus:ring-blue-400 focus:outline-none bg-transparent ${classnameColor} text-sm sm:text-base`}
                        placeholder={`${formatNumber(0, 2, decimalSeparator)}`}
                      /> */}

                      <div className="hidden group-hover:flex flex-col absolute right-2 top-1/2 -translate-y-1/2">
                        <button
                          onClick={() => modificarValor(idx, 'arriba')}
                          tabIndex={-1}
                          className="rounded-t text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 shadow-sm transition-colors"
                          title="Incrementar peso"
                        >
                          <ChevronUpIcon />
                        </button>
                        <button
                          onClick={() => modificarValor(idx, 'abajo')}
                          tabIndex={-1}
                          className="rounded-b text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 shadow-sm transition-colors"
                          title="Decrementar peso"
                        >
                          <ChevronDownIcon />
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-blue-50 dark:bg-blue-900/30">
              <td className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center font-bold text-gray-800 dark:text-gray-100">
                Σ
              </td>
              {columnSums.map((sum, colIdx) => (
                <td key={colIdx} className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center font-bold text-blue-700 dark:text-blue-300">
                  {formatNumber(sum, 2, decimalSeparator)}
                </td>
              ))}
            </tr>
            <tr className="bg-green-50 dark:bg-green-900/30">
              <td className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center font-bold text-gray-800 dark:text-gray-100">
                Total
              </td>
              <td colSpan={columns} className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center font-bold text-green-700 dark:text-green-300 text-lg">
                {formatNumber(totalSum, 2, decimalSeparator)} kg
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// Componente: Panel de Análisis
const PanelAnalisis = ({ analysis, decimalSeparator }) => {
  if (!analysis) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Análisis de Datos</h2>
        </div>
        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
          <p>Ingresa los pesos para ver el análisis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Análisis de Datos</h2>
      </div>

      <div className="space-y-3">
        <StatItem label="Peso Mínimo" value={`${formatNumber(analysis.pesoMinimo, 3, decimalSeparator)} kg`} />
        <StatItem label="Peso Máximo" value={`${formatNumber(analysis.pesoMaximo, 3, decimalSeparator)} kg`} />
        <StatItem label="Rango" value={`${formatNumber(analysis.rango, 3, decimalSeparator)} kg`} />
        <StatItem label="Promedio" value={`${formatNumber(analysis.promedio, 3, decimalSeparator)} kg`} valueClass="text-green-600 dark:text-green-400" />
        <StatItem label="Mediana" value={`${formatNumber(analysis.mediana, 3, decimalSeparator)} kg`} />
        <StatItem label="Desviación Estándar" value={`${formatNumber(analysis.desviacion, 3, decimalSeparator)} kg`} />
        <StatItem label="Coef. de Variación" value={`${formatNumber(analysis.cv, 1, decimalSeparator)} %`} />

        <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg mt-4">
          <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2">Rango ±10%</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-700 dark:text-gray-300">Rango (10%): <span className="font-bold">{formatNumber(analysis.rango10, 3, decimalSeparator)} kg</span></p>
            <p className="text-gray-700 dark:text-gray-300">Mín (-10%): <span className="font-bold">{formatNumber(analysis.min10, 3, decimalSeparator)} kg</span></p>
            <p className="text-gray-700 dark:text-gray-300">Máx (+10%): <span className="font-bold">{formatNumber(analysis.max10, 3, decimalSeparator)} kg</span></p>
          </div>
        </div>

        <StatItem label="Aves dentro del rango" value={`${analysis.avesDentroRango} / ${analysis.totalAves}`} />
        <StatItem 
          label="Uniformidad" 
          value={`${formatNumber(analysis.uniformidad, 1, decimalSeparator)} %`} 
          valueClass={`text-2xl ${analysis.uniformidad >= 75 ? 'text-green-600' : analysis.uniformidad >= 50 ? 'text-orange-600' : 'text-red-600'}`}
        />
        <StatItem label="Aves por debajo del rango" value={analysis.avesDebajoRango} valueClass="text-orange-600 dark:text-orange-400" />
        <StatItem label="Aves por encima del rango" value={analysis.avesEncimaRango} valueClass="text-blue-600 dark:text-blue-400" />
      </div>
    </div>
  );
};

const StatItem = ({ label, value, valueClass = "text-gray-800 dark:text-gray-100" }) => (
  <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    <p className={`text-lg font-bold ${valueClass}`}>{value}</p>
  </div>
);

const HistorialRegistros = ({ registros, onDelete, onLoad, onExportAll, onImportAll, onImportFromText, decimalSeparator }) => {
  const fileCsvInputRef = useRef(null);
  const fileJsonInputRef = useRef(null);
  const [showTextImport, setShowTextImport] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const menuRef = useRef(null);
  const menuExportRef = useRef(null);
  const buttonRef = useRef(null);
  const buttonExportRef = useRef(null);

  useClickOutside([menuRef, buttonRef], () => {
    setShowMenu(false);
  });

  useClickOutside([menuExportRef, buttonExportRef], () => {
    setShowExportMenu(false);
  });

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      setShowTextImport(false);
    }
  };
  
  const handleTextImport = () => {
    if (!jsonText.trim()) {
      return;
    }
    onImportFromText(jsonText);
    setJsonText('');
    setShowTextImport(false);
  };

  const handleFileJsonSelect = () => {
    fileJsonInputRef.current?.click();
  };

  const handleFileCsvSelect = () => {
    fileCsvInputRef.current?.click();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 mb-2 sm:mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <History className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Historial de Registros</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileJsonInputRef}
            type="file"
            accept=".json, application/json"
            onChange={onImportAll}
            style={{ display: 'none' }}
          />
          <input
            ref={fileCsvInputRef}
            type="file"
            accept=".csv, text/csv"
            onChange={onImportAll}
            style={{ display: 'none' }}
          />
          <div className="flex flex-auto items-end relative">
            <button
            ref={buttonRef}
              onClick={() => setShowMenu(!showMenu)}
              className="flex flex-auto items-center justify-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
            >
              <Upload className="w-4 h-4" /> Importar
            </button>
            {showMenu && (
              <div ref={menuRef} className="absolute mb-2 top-full left-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 min-w-[150px]">
                <button
                  onClick={() => {
                    handleFileJsonSelect();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  JSON
                </button>
                <button
                  onClick={() => {
                    handleFileCsvSelect();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-green-600" />
                  CSV
                </button>
                <button
                  onClick={() => {
                    setShowTextImport(!showTextImport)
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  {/* {showTextImport ? 'Cerrar' : 'Texto'} */}
                  Texto
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-auto items-end relative">
            <button
              ref={buttonExportRef}
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex flex-auto items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            {showExportMenu && (
              <div ref={menuExportRef} className="absolute mb-2 top-full right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 min-w-[150px]">
                <button
                  onClick={() => {
                    onExportAll('J');
                    setShowExportMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  JSON
                </button>
                <button
                  onClick={() => {
                    onExportAll('C');
                    setShowExportMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-green-600" />
                  CSV
                </button>
              </div>
            )}
        </div>
        </div>
      </div>
      
      {showTextImport && (
        <div onClick={handleBackdropClick} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  <FileText className="w-6 h-6 inline mr-2 text-blue-600" />
                  Importar de Texto
                  </h2>
                <button
                  onClick={() => {
                    setJsonText('');
                    setShowTextImport(false);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                1. Abre el archivo backup.json con un editor de texto<br/>
                2. Copia todo el contenido (Ctrl+A, Ctrl+C)<br/>
                3. Pega aquí abajo (Ctrl+V)<br/>
                4. Haz clic en "Importar Datos"
              </p>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='Pega aquí el contenido del archivo JSON...'
                className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => {
                    setJsonText('');
                    setShowTextImport(false);
                  }}
                  className="whitespace-nowrap flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleTextImport}
                  disabled={!jsonText.trim()}
                  className="whitespace-nowrap flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Importar Datos
                </button>
            </div>
          </div>
        </div>
      )}
      
      {registros.length === 0 ? (
        <p className="text-center py-8 text-gray-400 dark:text-gray-500">No hay registros guardados</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-gray-800 dark:text-gray-100">Fecha</th>
                <th className="px-4 py-2 text-left text-gray-800 dark:text-gray-100">Corral</th>
                <th className="px-4 py-2 text-left text-gray-800 dark:text-gray-100">Sexo</th>
                <th className="px-4 py-2 text-left text-gray-800 dark:text-gray-100">Edad</th>
                <th className="px-4 py-2 text-left text-gray-800 dark:text-gray-100">Aves</th>
                <th className="px-4 py-2 text-left text-gray-800 dark:text-gray-100">Promedio</th>
                <th className="px-4 py-2 text-left text-gray-800 dark:text-gray-100">Uniformidad</th>
                <th className="px-4 py-2 text-center text-gray-800 dark:text-gray-100">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registros.map(registro => (
                <tr key={registro.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-300 truncate max-w-sm">{registro.fecha}</td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-300 font-semibold">{registro.corral}</td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-300 font-semibold">{registro.sex}</td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">{registro.edad} días</td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{registro.analysis.totalAves}</td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                    <span className="font-semibold text-green-600">
                      {formatNumber(registro.analysis.promedio, 3, decimalSeparator)} kg
                    </span>
                  </td>                  
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                    <span className={`font-semibold ${registro.analysis.uniformidad >= 75 ? 'text-green-600' : registro.analysis.uniformidad >= 50  ?'text-orange-600' : 'text-red-600'}`}>
                      {formatNumber(registro.analysis.uniformidad, 1, decimalSeparator)} %
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => onLoad(registro)}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs font-medium"
                      >
                        Cargar
                      </button>
                      <button
                        onClick={() => onDelete(registro.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs font-medium"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const PoultryWeightTracker = () => {
  const [corral, setCorral] = useState('1A');
  const [edad, setEdad] = useState('7');
  const [sex, setSex] = useState('Hembra');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [showFillOutModal, setShowFillOutModal] = useState(false);
  const [loadedRecordId, setLoadedRecordId] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  
  const [decimalSeparator, setDecimalSeparator] = useState(() => {
    return localStorage.getItem('decimalSeparator') || 'coma';
  });

  const [targetAvg, setTargetAvg] = useState('');
  const [targetUni, setTargetUni] = useState('');
  const [targetRange, setTargetRange] = useState('');

  useEffect(() => {
    localStorage.setItem('decimalSeparator', decimalSeparator);
  }, [decimalSeparator]);
  
  const { theme, setTheme } = useDarkMode();
  const weightManager = useWeights(60);
  const { calculateAnalysis } = useAnalysis(weightManager.getValidWeights);
  const recordManager = useRecords();
  const { showToast, ToastContainer } = useToast();

  const analysis = calculateAnalysis();

  useEffect(() => {
    return () => {
      setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    };
  }, []);

  // Memoizar setters para evitar re-renders
  const memoizedSetCorral = useCallback((value) => setCorral(value), []);
  const memoizedSetSex = useCallback((value) => setSex(value), []);
  const memoizedSetEdad = useCallback((value) => setEdad(value), []);
  const memoizedSetDecimalSeparator = useCallback((value) => setDecimalSeparator(value), []);
  const memoizedSetTheme = useCallback((value) => setTheme(value), [setTheme]);

  const handleSave = useCallback(() => {
    const result = recordManager.saveRecord(
      corral,
      sex,
      edad,
      weightManager.numUnidades,
      weightManager.weights,
      analysis,
      false,
      null
    );
    if (result.success) {
      showToast(result.message, 'success');
      setLoadedRecordId(null);
      weightManager.clearWeights();
    } else {
      showToast(result.message, 'error');
    }
  }, [corral, sex, edad, weightManager, analysis, recordManager, showToast]);

  const handleUpdate = useCallback(() => {
    if (!loadedRecordId) {
      showToast('No hay registro cargado para actualizar', 'warning');
      return;
    }
    const result = recordManager.saveRecord(
      corral,
      sex,
      edad,
      weightManager.numUnidades,
      weightManager.weights,
      analysis,
      true,
      loadedRecordId
    );
    if (result.success) {
      showToast(result.message, 'success');
    } else {
      showToast(result.message, 'error');
    }
  }, [corral, sex, edad, loadedRecordId, weightManager, analysis, recordManager, showToast]);

  const handleExport = useCallback(() => {
    const result = exportUtils.exportToCSV(
      corral,
      sex,
      edad,
      analysis,
      weightManager.getValidWeights()
    );
    if (result.success) {
      showToast(result.message, 'success');
    }
  }, [corral, sex, edad, analysis, weightManager, showToast]);

  const handleExportExcel = useCallback(() => {
  const result = exportUtils.exportToExcel(
    corral,
    sex,
    edad,
    analysis,
    weightManager.getValidWeights()
  );
  if (result.success) {
    showToast(result.message, 'success');
  }
}, [corral, sex, edad, analysis, weightManager, showToast]);

  const handleExportPDF = useCallback(() => {
  const result = exportUtils.exportToPDF(
    corral,
    sex,
    edad,
    analysis,
    weightManager.getValidWeights()
  );
  if (result.success) {
    showToast(result.message, 'success');
  }
}, [corral, sex, edad, analysis, weightManager, showToast]);

  const handleImportFromText = useCallback((text) => {
    try {
      // Intentar como CSV primero
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines[0] && lines[0].includes('ID,Fecha,Corral')) {
        // Es CSV
        const records = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const values = [];
          let current = '';
          let inQuotes = false;
          
          for (let char of line) {
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(current);
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current);

          if (values.length >= 21) {
            const weightsStr = values[20].replace(/"/g, '');
            const weightsArray = weightsStr.split(';').filter(w => w.trim());
            
            const record = {
              id: parseInt(values[0]),
              fecha: values[1].replace(/"/g, ''),
              corral: values[2],
              edad: parseInt(values[3]),
              numUnidades: parseInt(values[4]),
              weights: weightsArray,
              analysis: {
                totalAves: parseInt(values[5]),
                promedio: parseFloat(values[6]),
                mediana: parseFloat(values[7]),
                uniformidad: parseFloat(values[8]),
                cv: parseFloat(values[9]),
                pesoMinimo: parseFloat(values[10]),
                pesoMaximo: parseFloat(values[11]),
                rango: parseFloat(values[12]),
                desviacion: parseFloat(values[13]),
                rango10: parseFloat(values[14]),
                min10: parseFloat(values[15]),
                max10: parseFloat(values[16]),
                avesDentroRango: parseInt(values[17]),
                avesDebajoRango: parseInt(values[18]),
                avesEncimaRango: parseInt(values[19])
              }
            };
            
            records.push(record);
          }
        }

        if (records.length > 0) {
          const result = recordManager.importRecords(records);
          showToast(result.message, 'success');
          return;
        }
      }
      
      // Si no es CSV, intentar como JSON
      const data = JSON.parse(text);
      
      if (!data?.records?.length) {
        showToast('El texto no contiene registros válidos', 'error');
        return;
      }

      const valid = data.records.filter(r => r?.id && r?.corral);

      if (!valid.length) {
        showToast('No se encontraron registros válidos', 'error');
        return;
      }

      const result = recordManager.importRecords(valid);
      showToast(result.message, 'success');
    } catch (error) {
      showToast('Formato de datos inválido', 'error');
    }
  }, [recordManager, showToast]);

  const handleExportAll = useCallback((mimetype) => {
    const result = mimetype === 'J'
                  ? exportUtils.exportAllToJSON(recordManager.registros)
                  : exportUtils.exportAllToCSVBackup(recordManager.registros);
    if (result.success) {
      showToast(result.message, 'success');
    } else {
      showToast(result.message, 'error');
    }
  }, [recordManager.registros, showToast]);

  const handleImportAll = useCallback(async (e) => {
    const file = e.target.files?.[0];
    const input = e.target;
    
    if (!file) {
      input.value = '';
      return;
    }

    input.disabled = true;

    try {
      let records;
      
      // Detectar tipo de archivo
      if (file.name.endsWith('.csv')) {
        records = await exportUtils.importFromCSV(file);
      } else if (file.name.endsWith('.json')) {
        records = await exportUtils.importFromJSON(file);
      } else {
        throw new Error('Formato no soportado. Use .csv o .json');
      }
      
      const result = recordManager.importRecords(records);
      showToast(result.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      input.value = '';
      input.disabled = false;
    }
  }, [recordManager, showToast]);

  const handleLoadRecord = useCallback((record) => {
    setCorral(record.corral);
    setSex(record.sex);
    setEdad(record.edad.toString());
    weightManager.loadWeights(record.weights, record.numUnidades);
    setLoadedRecordId(record.id);
    setShowHistory(false);
    showToast('Registro cargado. Puedes editarlo y usar "Actualizar" para guardarlo', 'success');
  }, [weightManager, showToast]);

  const handleDeleteRecord = useCallback((id) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar registro?',
      message: '¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.',
      onConfirm: () => {
        recordManager.deleteRecord(id);
        if (loadedRecordId === id) {
          setLoadedRecordId(null);
          weightManager.clearWeights();
        }
        showToast('Registro eliminado exitosamente', 'success');
      }
    });
  }, [recordManager, loadedRecordId, weightManager, showToast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-2 sm:p-4 transition-colors">
      <ToastContainer />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 mb-2 sm:mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="w-8 h-8 text-green-600 dark:text-green-400" />
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Registro de Pesos</h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition-colors"
              >
                {isMenuOpen ? (
                  <X className="w-6 h-6 text-gray-800 dark:text-gray-100" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-800 dark:text-gray-100" />
                )}
              </button>

              <div
                className={`
                  absolute md:static top-20 right-6
                  bg-white dark:bg-gray-800 md:bg-transparent
                  rounded-lg shadow-lg md:shadow-none
                  p-4 md:p-0 z-50
                  flex flex-col md:flex-row
                  gap-4 md:gap-3
                  transition-all duration-300
                  md:flex
                  ${isMenuOpen ? 'block' : 'hidden'}
                `}
              >
                <ThemeSwitcher theme={theme} setTheme={memoizedSetTheme} />
                <DecimalSeparatorSwitcher decimalSeparator={decimalSeparator} setDecimalSeparator={memoizedSetDecimalSeparator} />
                <button
                  onClick={() => {
                    setShowHistory(!showHistory);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  <History className="w-5 h-5" /> Historial ({recordManager.registros.length})
                </button>
              </div>
            </div>
          </div>

          <FormularioEntrada
            corral={corral}
            setCorral={memoizedSetCorral}
            edad={edad}
            setEdad={memoizedSetEdad}
            sex={sex}
            setSex={memoizedSetSex}
            numUnidades={weightManager.numUnidades}
            onNumUnidadesChange={weightManager.updateSize}
            onSave={handleSave}
            onUpdate={handleUpdate}
            onExportCSV={handleExport}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            canSave={!!analysis}
            isLoadedFromHistory={weightManager.isLoadedFromHistory}
          />
        </div>

        {showHistory && (
          <HistorialRegistros
            registros={recordManager.registros}
            onDelete={handleDeleteRecord}
            onLoad={handleLoadRecord}
            onExportAll={handleExportAll}
            onImportAll={handleImportAll}
            onImportFromText={handleImportFromText}
            decimalSeparator={decimalSeparator}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-6">
          <div className="lg:col-span-2">
            <TablaPesos
              weights={weightManager.weights}
              numUnidades={weightManager.numUnidades}
              onWeightChange={weightManager.updateWeight}
              onClear={weightManager.clearWeights}
              onImport={() => setShowImportModal(true)}
              onExportText={weightManager.exportWeightsToText}
              onOptimize={() => setShowOptimizeModal(true)}
              onFillOut={() => setShowFillOutModal(true)}
              decimalSeparator={decimalSeparator}
              targetUni={targetUni}
              analysis={analysis}
              weightManager={weightManager}
              showToast={showToast}
              setConfirmDialog={setConfirmDialog}
            />
          </div>

          <PanelAnalisis analysis={analysis} decimalSeparator={decimalSeparator} />
        </div>

        {recordManager.registros.length > 0 && !showHistory && (
          <div className="mt-2 sm:mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              📊 Tienes <span className="font-bold text-green-600 dark:text-green-400">{recordManager.registros.length}</span> registro(s) guardado(s) en localStorage
            </p>
          </div>
        )}

        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={weightManager.importWeightsFromText}
          showToast={showToast}
        />

        <OptimizeUniformityModal
          isOpen={showOptimizeModal}
          onClose={() => setShowOptimizeModal(false)}
          /* onOptimize={(targetMin, targetMax) => {
            const result = weightManager.optimizeUniformity(targetMin, targetMax);
            if (result.success) {
              showToast(result.message, 'success');
            } else {
              showToast(result.message, 'info');
            }
          }} */
          targetUni={targetUni}
          setTargetUni={(value) => setTargetUni(value || 0)}
          onOptimize={() => {
            const result = weightManager.optimizeUniformity(targetUni);
            if (result.success) {
              showToast(result.message, 'success');
            } else {
              showToast(result.message, 'info');
            }
          }}
          currentUniformity={analysis?.uniformidad}
        />

        <GenerateWeightsModal
          isOpen={showFillOutModal}
          onClose={() => setShowFillOutModal(false)}
          targetAvg={targetAvg}
          setTargetAvg={(value) => setTargetAvg(value || 0)}
          targetRange={targetRange}
          setTargetRange={(value) => setTargetRange(value || 0)}
          onGenerate={() => {
            const result = weightManager.handleFillWeights(targetAvg, targetRange, weightManager.numUnidades);
            if (result.success) {
              showToast(result.message, 'success');
            } else {
              showToast(result.message, 'info');
            }
          }}
          decimalSeparator={decimalSeparator}
        />
      </div>
    </div>
  );
};

export default PoultryWeightTracker;