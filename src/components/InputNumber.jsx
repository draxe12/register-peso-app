import { formatNumber, formatNumberForDisplay } from '../utils/format';
import { ChevronDownIcon, ChevronUpIcon, CommaIcon, DotIcon } from './icons';

const InputNumber = ({ value, onChange, label = '', min = 0, max = Infinity, step = 0.001, placeholder = '', icon = '', decimalSeparator = 'punto', decimalToFixed = 3, className }) => {

    const enterValue = (value) => {
        let valueToProcess = String(value);
        valueToProcess = valueToProcess.replace(',', '.').replace(/[^0-9.]/g, '');
        onChange(valueToProcess);
    };

    const normalizeFloat = (value) => {
        // 1. Reemplaza la coma por punto
        // 2. Elimina cualquier caracter que no sea número o punto
        const normalized = value.replace(',', '.').replace(/[^\d.]/g, '');

        // 3. Convertir a número
        const floatValue = parseFloat(normalized);

        return isNaN(floatValue) ? 0 : floatValue;
    };

    const handleInputChange = (e) => {
        const inputValue = e.target.value; // Guardas el string tal cual (ej: "75,00")
        onChange(inputValue);

        // Opcional: Actualizar el valor numérico en un estado paralelo para cálculos
        const numericValue = normalizeFloat(inputValue);
        onChange(numericValue);
    };

    /* const esDecimalParConDosDigitos = (numero) => {
        const numeroComoCadena = numero.toFixed(2);
        const puntoDecimalIndex = numeroComoCadena.indexOf('.');
        if (puntoDecimalIndex === -1) return false;
        const parteDecimalComoCadena = numeroComoCadena.substring(puntoDecimalIndex + 1);
        const parteDecimalComoNumero = parseInt(parteDecimalComoCadena, 10);
        return parteDecimalComoNumero % 2 === 0;
    }; */

    const updateValue = (value, direccion) => {
        const currentValue = parseFloat(value) || 0;
        const newValue = direccion === 'arriba'
            ? Math.min(max, currentValue + step).toFixed(decimalToFixed)
            : Math.max(min, currentValue - step).toFixed(decimalToFixed);
        onChange(newValue);
    };


    //const classnameColor = value < 0 ? 'text-red-500' : 'text-gray-900 dark:text-gray-100';
    const valueInput = formatNumberForDisplay(value, decimalSeparator === 'coma' ? ',' : '.');
    const placeholderInput = formatNumber(0, decimalToFixed, decimalSeparator);
    const classNameInput = className ? className : `w-full px-2 py-2 pr-8 text-center border-none focus:ring-2 focus:ring-blue-400 focus:outline-none bg-transparent text-gray-700 dark:text-gray-300 text-sm sm:text-base`;

    return (
        <div
            className="p-0 relative group"
        >
            <input
                type="text"
                inputMode="decimal"
                max={max}
                min={min}
                step={step}
                value={valueInput}
                onChange={(e) => enterValue(e.target.value)}
                className={classNameInput}
                //className={`w-full px-2 py-2 pr-8 text-center border-none focus:ring-2 focus:ring-blue-400 focus:outline-none bg-transparent ${classnameColor} text-sm sm:text-base`}
                placeholder={`${placeholderInput}`}
            />
            <div className="hidden group-hover:flex flex-col absolute right-2 top-1/2 -translate-y-1/2">
                <button
                    onClick={() => updateValue(value, 'arriba')}
                    tabIndex={-1}
                    className="rounded-t text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 shadow-sm transition-colors"
                    title="Incrementar peso"
                >
                    <ChevronUpIcon />
                </button>
                <button
                    onClick={() => updateValue(value, 'abajo')}
                    tabIndex={-1}
                    className="rounded-b text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 shadow-sm transition-colors"
                    title="Decrementar peso"
                >
                    <ChevronDownIcon />
                </button>
            </div>
        </div>
    );
};

export default InputNumber;