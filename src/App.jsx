import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Scale, Upload, FileText, Camera, X, Save, Download, History, Trash2, BarChart3, Moon, Sun, Monitor, Edit, Menu, Sparkles } from 'lucide-react';

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

// ==================== UTILIDADES DE FORMATO ====================
const formatNumber = (value, decimals, separator) => {
    if (value === null || value === undefined || isNaN(value)) return '0';
    const factor = Math.pow(10, decimals);
    const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
    const fixed = rounded.toFixed(decimals);
    return separator === 'coma' ? fixed.replace('.', ',') : fixed;
};

const formatNumberForDisplay = (value, separator) => {
  if (!value || value === '') return '';
  const strValue = String(value);
  return separator === ',' ? strValue.replace('.', ',') : strValue.replace(',', '.');
};

// ==================== HOOKS PERSONALIZADOS ====================

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
    
    const finalSize = Math.min(size, 300);
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
      .filter(w => w !== '' && !isNaN(parseFloat(w)))
      .map(w => parseFloat(w))
      .sort((a, b) => a - b);
  };

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

  const optimizeUniformity = (targetMin = 75, targetMax = 85) => {
    const validIndices = [];
    const validWeights = [];
    
    weights.forEach((w, idx) => {
      if (w !== '' && !isNaN(parseFloat(w))) {
        validIndices.push(idx);
        validWeights.push(parseFloat(w));
      }
    });

    if (validWeights.length < 3) {
      return { success: false, message: 'Se necesitan al menos 3 pesos válidos para optimizar' };
    }

    if (!backupWeights) {
      setBackupWeights([...weights]);
      setBackupNumUnidades(numUnidades);
    }

    const roundToEvenDecimals = (value) => {
      let rounded = Math.round(value * 100) / 100;
      let decimalPart = Math.round((rounded % 1) * 100);
      
      if (decimalPart % 2 !== 0) {
        if (Math.random() < 0.5) {
          decimalPart += 1;
        } else {
          decimalPart -= 1;
        }
        rounded = Math.floor(rounded) + (decimalPart / 100);
      }
      
      return parseFloat(rounded.toFixed(2));
    };

    const promedio = validWeights.reduce((sum, w) => sum + w, 0) / validWeights.length;
    const rango10 = promedio * 0.1;
    const min10 = promedio - rango10;
    const max10 = promedio + rango10;

    const dentroRango = validWeights.filter(w => w >= min10 && w <= max10).length;
    const uniformidadActual = (dentroRango / validWeights.length) * 100;

    const needsIncrease = uniformidadActual < targetMin;
    const needsDecrease = uniformidadActual > targetMax;

    if (!needsIncrease && !needsDecrease) {
      return { success: false, message: `La uniformidad (${uniformidadActual.toFixed(1)}%) ya está en el rango objetivo (${targetMin}%-${targetMax}%)` };
    }

    const columns = 3;
    const columnGroups = [[], [], []];

    validIndices.forEach((idx, i) => {
      const col = idx % columns;
      columnGroups[col].push({
        index: idx,
        weight: validWeights[i],
        inRange: validWeights[i] >= min10 && validWeights[i] <= max10
      });
    });

    const newWeights = [...weights];
    let totalAdjusted = 0;

    if (needsIncrease) {
      columnGroups.forEach(columnWeights => {
        if (columnWeights.length === 0) return;

        const originalSum = columnWeights.reduce((sum, w) => sum + w.weight, 0);
        const outOfRange = columnWeights.filter(w => !w.inRange);
        const inRange = columnWeights.filter(w => w.inRange);

        if (outOfRange.length === 0 || inRange.length === 0) return;

        const adjustedWeights = new Map();

        outOfRange.forEach(item => {
          const currentWeight = item.weight;
          let targetWeight;

          if (currentWeight < min10) {
            targetWeight = min10 + 0.02;
          } else {
            targetWeight = max10 - 0.02;
          }

          targetWeight = roundToEvenDecimals(targetWeight);
          adjustedWeights.set(item.index, targetWeight);
        });

        let totalDiff = 0;
        outOfRange.forEach(item => {
          totalDiff += adjustedWeights.get(item.index) - item.weight;
        });

        const compensationPerWeight = -totalDiff / inRange.length;
        
        inRange.forEach(item => {
          let compensated = item.weight + compensationPerWeight;
          compensated = roundToEvenDecimals(compensated);
          adjustedWeights.set(item.index, compensated);
        });

        let newSum = 0;
        columnWeights.forEach(item => {
          newSum += adjustedWeights.get(item.index);
        });

        const sumDiff = originalSum - newSum;
        
        if (Math.abs(sumDiff) > 0.001) {
          const adjustmentStep = sumDiff > 0 ? 0.02 : -0.02;
          let remaining = sumDiff;
          let idx = 0;

          while (Math.abs(remaining) >= 0.01 && idx < inRange.length) {
            const item = inRange[idx];
            const current = adjustedWeights.get(item.index);
            const adjusted = roundToEvenDecimals(current + adjustmentStep);
            adjustedWeights.set(item.index, adjusted);
            remaining -= adjustmentStep;
            idx++;
          }
        }

        adjustedWeights.forEach((weight, index) => {
          newWeights[index] = weight.toFixed(2);
        });

        totalAdjusted += outOfRange.length;
      });

      setWeights(newWeights);
      return { 
        success: true, 
        message: `Uniformidad mejorada. Se ajustaron ${totalAdjusted} peso(s)`,
        adjustedCount: totalAdjusted
      };

    } else {
      columnGroups.forEach(columnWeights => {
        if (columnWeights.length === 0) return;

        const originalSum = columnWeights.reduce((sum, w) => sum + w.weight, 0);

        const nearLimits = columnWeights
          .filter(w => w.inRange)
          .map(w => ({
            ...w,
            distanceToMin: Math.abs(w.weight - min10),
            distanceToMax: Math.abs(w.weight - max10)
          }))
          .sort((a, b) => {
            const minDistA = Math.min(a.distanceToMin, a.distanceToMax);
            const minDistB = Math.min(b.distanceToMin, b.distanceToMax);
            return minDistA - minDistB;
          });

        const targetOut = Math.ceil(columnWeights.length * 0.15);
        const toAdjust = nearLimits.slice(0, Math.min(targetOut, nearLimits.length));
        const remaining = columnWeights.filter(w => !toAdjust.find(t => t.index === w.index));

        if (toAdjust.length === 0 || remaining.length === 0) return;

        const adjustedWeights = new Map();

        toAdjust.forEach(item => {
          const currentWeight = item.weight;
          let targetWeight;

          if (item.distanceToMin < item.distanceToMax) {
            targetWeight = min10 - 0.02;
          } else {
            targetWeight = max10 + 0.02;
          }

          targetWeight = roundToEvenDecimals(targetWeight);
          adjustedWeights.set(item.index, targetWeight);
        });

        let totalDiff = 0;
        toAdjust.forEach(item => {
          totalDiff += adjustedWeights.get(item.index) - item.weight;
        });

        const compensationPerWeight = -totalDiff / remaining.length;
        
        remaining.forEach(item => {
          let compensated = item.weight + compensationPerWeight;
          compensated = roundToEvenDecimals(compensated);
          adjustedWeights.set(item.index, compensated);
        });

        let newSum = 0;
        columnWeights.forEach(item => {
          newSum += adjustedWeights.get(item.index);
        });

        const sumDiff = originalSum - newSum;
        
        if (Math.abs(sumDiff) > 0.001) {
          const adjustmentStep = sumDiff > 0 ? 0.02 : -0.02;
          let remaining = sumDiff;
          let idx = 0;

          while (Math.abs(remaining) >= 0.01 && idx < toAdjust.length) {
            const item = toAdjust[idx];
            const current = adjustedWeights.get(item.index);
            const adjusted = roundToEvenDecimals(current + adjustmentStep);
            adjustedWeights.set(item.index, adjusted);
            remaining -= adjustmentStep;
            idx++;
          }
        }

        adjustedWeights.forEach((weight, index) => {
          newWeights[index] = weight.toFixed(2);
        });

        totalAdjusted += toAdjust.length;
      });

      setWeights(newWeights);
      return { 
        success: true, 
        message: `Uniformidad ajustada a rango óptimo. Se modificaron ${totalAdjusted} peso(s)`,
        adjustedCount: totalAdjusted
      };
    }
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
    loadWeights,
    isLoadedFromHistory,
    optimizeUniformity,
    backupWeights,
    restoreBackup,
    discardBackup
  };
};

// Hook para análisis estadístico
const useAnalysis = (getValidWeights) => {
  const calculateAnalysis = () => {
    const validWeights = getValidWeights();
    
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

  const saveRecord = (corral, edad, numUnidades, weights, analysis, isUpdate = false, recordId = null) => {
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
  exportToCSV: (corral, edad, analysis, validWeights) => {
    if (!analysis) {
      return { success: false, message: 'No hay datos para exportar' };
    }

    let csv = 'Registro de Pesos de Pollos\n\n';
    csv += `Corral:,${corral}\n`;
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
    csv += 'Fecha,Corral,Edad (días),Total Aves,Promedio (kg),Uniformidad (%),CV (%),Mín (kg),Máx (kg)\n';
    
    registros.forEach(r => {
      csv += `${r.fecha},${r.corral},${r.edad},${r.analysis.totalAves},${r.analysis.promedio.toFixed(3)},${r.analysis.uniformidad.toFixed(1)},${r.analysis.cv.toFixed(1)},${r.analysis.pesoMinimo.toFixed(3)},${r.analysis.pesoMaximo.toFixed(3)}\n`;
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
    return { success: true, message: 'Backup JSON exportado exitosamente' };
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

// Iconos SVG personalizados
const CommaIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 7A3 3 0 0 1 13 10V13A3 3 0 0 1 7 13V10A3 3 0 0 1 10 7M10 9A1 1 0 0 0 9 10V13A1 1 0 0 0 11 13V10A1 1 0 0 0 10 9M17 7A3 3 0 0 1 20 10V13A3 3 0 0 1 14 13V10A3 3 0 0 1 17 7M17 9A1 1 0 0 0 16 10V13A1 1 0 0 0 18 13V10A1 1 0 0 0 17 9M5 14A1 1 0 0 0 4 15L5 18H6V15A1 1 0 0 0 5 14Z" />
  </svg>
);

const DotIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 7A3 3 0 0 0 7 10V13A3 3 0 0 0 13 13V10A3 3 0 0 0 10 7M11 13A1 1 0 0 1 9 13V10A1 1 0 0 1 11 10M17 7A3 3 0 0 0 14 10V13A3 3 0 0 0 20 13V10A3 3 0 0 0 17 7M18 13A1 1 0 0 1 16 13V10A1 1 0 0 1 18 10M6 15A1 1 0 1 1 5 14A1 1 0 0 1 6 15Z" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

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
const OptimizeUniformityModal = ({ isOpen, onClose, onOptimize, currentUniformity }) => {
  const [targetMin, setTargetMin] = useState(75);
  const [targetMax, setTargetMax] = useState(85);

  if (!isOpen) return null;

  const handleOptimize = () => {
    if (targetMin >= targetMax) {
      alert('El mínimo debe ser menor que el máximo');
      return;
    }
    if (targetMin < 50 || targetMax > 95) {
      alert('Los valores deben estar entre 50% y 95%');
      return;
    }
    onOptimize(targetMin, targetMax);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            <Sparkles className="w-6 h-6 inline mr-2 text-purple-600" />
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
              {currentUniformity < 75 ? '📈 Se aumentará la uniformidad' : '📉 Se reducirá la uniformidad'}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Uniformidad Mínima Deseada (%)
              </label>
              <input
                type="number"
                min="50"
                max="95"
                value={targetMin}
                onChange={(e) => setTargetMin(parseInt(e.target.value) || 75)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Uniformidad Máxima Deseada (%)
              </label>
              <input
                type="number"
                min="50"
                max="95"
                value={targetMax}
                onChange={(e) => setTargetMax(parseInt(e.target.value) || 85)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              💡 <strong>Recomendado:</strong> 75% - 85%
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

// Componente: Modal de Importación
const ImportModal = ({ isOpen, onClose, onImport, showToast }) => {
  const [textInput, setTextInput] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Importar Pesos</h2>
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
                onClick={handleTextImport}
                className="mt-3 w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
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
const FormularioEntrada = React.memo(({ corral, setCorral, edad, setEdad, numUnidades, onNumUnidadesChange, onSave, onUpdate, onExport, canSave, isLoadedFromHistory }) => {
  const corrales = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B', '6A', '6B', '7A', '7B', '8A', '8B', '9A', '9B'];
  const edades = [7, 14, 21, 28, 35, 42];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
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
        <input
          type="number"
          value={numUnidades}
          onChange={(e) => onNumUnidadesChange(e.target.value)}
          onBlur={(e) => {
            if (e.target.value === '' || e.target.value === '0') {
              onNumUnidadesChange('60');
            }
          }}
          min="1"
          max="300"
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

      <div className="flex items-end">
        <button
          onClick={onExport}
          disabled={!canSave}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>
    </div>
  );
});

// Componente: Tabla de Pesos
const TablaPesos = ({ weights, numUnidades, onWeightChange, onClear, onImport, onOptimize, decimalSeparator, analysis, weightManager, showToast, setConfirmDialog }) => {
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
          {analysis && (analysis.uniformidad < 75 || analysis.uniformidad > 85) && (
            <button
              onClick={onOptimize}
              className="flex flex-auto items-center justify-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all text-sm font-medium gap-2 shadow-md"
              title="Optimizar uniformidad"
            >
              <Sparkles className="w-4 h-4" />
              {analysis.uniformidad < 75 ? '↑ Optimizar' : '↓ Ajustar'}
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
                        className="w-full px-2 py-2 pr-8 text-center border-none focus:ring-2 focus:ring-blue-400 focus:outline-none bg-transparent text-gray-900 dark:text-gray-100 text-sm sm:text-base"
                        placeholder={`${formatNumber(0, 2, decimalSeparator)}`}
                      />

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
  const fileInputRef = useRef(null);
  const [showTextImport, setShowTextImport] = useState(false);
  const [jsonText, setJsonText] = useState('');

  const handleTextImport = () => {
    if (!jsonText.trim()) {
      return;
    }
    onImportFromText(jsonText);
    setJsonText('');
    setShowTextImport(false);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
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
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={onImportAll}
            style={{ display: 'none' }}
          />
          <button
            onClick={handleFileSelect}
            className="flex flex-auto items-center justify-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm font-medium"
          >
            <Upload className="w-4 h-4" />
            Archivo
          </button>
          <button
            onClick={() => setShowTextImport(!showTextImport)}
            className="flex flex-auto items-center justify-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
          >
            <FileText className="w-4 h-4" />
            {showTextImport ? 'Cerrar' : 'Texto'}
          </button>
          <button
            onClick={onExportAll}
            className="flex flex-auto items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>
      
      {showTextImport && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
            📋 Importar desde texto
          </h3>
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
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleTextImport}
              disabled={!jsonText.trim()}
              className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
            >
              Importar Datos
            </button>
            <button
              onClick={() => {
                setJsonText('');
                setShowTextImport(false);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [loadedRecordId, setLoadedRecordId] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  
  const [decimalSeparator, setDecimalSeparator] = useState(() => {
    return localStorage.getItem('decimalSeparator') || 'coma';
  });

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
  const memoizedSetEdad = useCallback((value) => setEdad(value), []);
  const memoizedSetDecimalSeparator = useCallback((value) => setDecimalSeparator(value), []);
  const memoizedSetTheme = useCallback((value) => setTheme(value), [setTheme]);

  const handleSave = useCallback(() => {
    const result = recordManager.saveRecord(
      corral,
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
  }, [corral, edad, weightManager, analysis, recordManager, showToast]);

  const handleUpdate = useCallback(() => {
    if (!loadedRecordId) {
      showToast('No hay registro cargado para actualizar', 'warning');
      return;
    }
    const result = recordManager.saveRecord(
      corral,
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
  }, [corral, edad, loadedRecordId, weightManager, analysis, recordManager, showToast]);

  const handleExport = useCallback(() => {
    const result = exportUtils.exportToCSV(
      corral,
      edad,
      analysis,
      weightManager.getValidWeights()
    );
    if (result.success) {
      showToast(result.message, 'success');
    }
  }, [corral, edad, analysis, weightManager, showToast]);

  const handleImportFromText = useCallback((jsonText) => {
    try {
      const data = JSON.parse(jsonText);
      
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
      showToast('El texto no es un JSON válido', 'error');
    }
  }, [recordManager, showToast]);

  const handleExportAll = useCallback(() => {
    const result = exportUtils.exportAllToJSON(recordManager.registros);
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
      const records = await exportUtils.importFromJSON(file);
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
                  <History className="w-5 h-5" />
                  Historial ({recordManager.registros.length})
                </button>
              </div>
            </div>
          </div>

          <FormularioEntrada
            corral={corral}
            setCorral={memoizedSetCorral}
            edad={edad}
            setEdad={memoizedSetEdad}
            numUnidades={weightManager.numUnidades}
            onNumUnidadesChange={weightManager.updateSize}
            onSave={handleSave}
            onUpdate={handleUpdate}
            onExport={handleExport}
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
              onOptimize={() => setShowOptimizeModal(true)}
              decimalSeparator={decimalSeparator}
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
          onOptimize={(targetMin, targetMax) => {
            const result = weightManager.optimizeUniformity(targetMin, targetMax);
            if (result.success) {
              showToast(result.message, 'success');
            } else {
              showToast(result.message, 'info');
            }
          }}
          currentUniformity={analysis?.uniformidad}
        />
      </div>
    </div>
  );
};

export default PoultryWeightTracker;