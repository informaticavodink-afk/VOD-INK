import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';

interface DatePickerProps {
  value: string; // Formato YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  error?: string;
  dark?: boolean; // Si es true, usa estilos oscuros para el bento del tutor
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

export default function DatePicker({
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  error,
  dark = false
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha actual o seleccionada para navegación interna del calendario
  const [navDate, setNavDate] = useState(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
      }
    }
    return new Date();
  });

  const year = navDate.getFullYear();
  const month = navDate.getMonth();

  // Actualizar la navegación si el valor externo cambia
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setNavDate(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1));
      }
    }
  }, [value]);

  // Cerrar al hacer click afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generar años (desde hace 100 años hasta el año actual)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 101 }, (_, i) => currentYear - i);

  // Datos de los días del mes
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Lunes = 0, Domingo = 6

  // Días del mes anterior para rellenar
  const prevMonthDays = new Date(year, month, 0).getDate();
  const daysFromPrevMonth = Array.from({ length: firstDayIndex }, (_, i) => {
    const d = prevMonthDays - firstDayIndex + i + 1;
    return { day: d, isCurrentMonth: false, monthOffset: -1 };
  });

  // Días del mes actual
  const daysFromCurrentMonth = Array.from({ length: daysInMonth }, (_, i) => {
    return { day: i + 1, isCurrentMonth: true, monthOffset: 0 };
  });

  // Rellenar hasta completar semanas completas (múltiplo de 7)
  const totalDaysSoFar = daysFromPrevMonth.length + daysFromCurrentMonth.length;
  const remainingDays = (7 - (totalDaysSoFar % 7)) % 7;
  const daysFromNextMonth = Array.from({ length: remainingDays }, (_, i) => {
    return { day: i + 1, isCurrentMonth: false, monthOffset: 1 };
  });

  const allGridDays = [...daysFromPrevMonth, ...daysFromCurrentMonth, ...daysFromNextMonth];

  const handleSelectDay = (day: number, monthOffset: number) => {
    let targetYear = year;
    let targetMonth = month + monthOffset;

    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    } else if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }

    const formattedMonth = String(targetMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${targetYear}-${formattedMonth}-${formattedDay}`;

    onChange(dateStr);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setNavDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setNavDate(new Date(year, month + 1, 1));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNavDate(new Date(year, parseInt(e.target.value), 1));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNavDate(new Date(parseInt(e.target.value), month, 1));
  };

  // Formatear valor para mostrarlo
  const getDisplayValue = () => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return value;
  };

  // Estilos temáticos
  const buttonBaseClass = dark
    ? 'w-full flex items-center justify-between border border-zinc-700 rounded-xl bg-zinc-800 text-white px-3.5 py-2.5 shadow-sm text-sm font-medium hover:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-white transition-all cursor-pointer'
    : 'w-full flex items-center justify-between border border-zinc-200 rounded-xl bg-white text-zinc-950 px-3.5 py-2.5 shadow-sm text-sm font-medium hover:border-zinc-300 focus:outline-none focus:ring-3 focus:ring-zinc-950/6 transition-all cursor-pointer';

  const popoverBaseClass = dark
    ? 'absolute left-0 mt-2 z-50 p-4 border border-zinc-700 bg-zinc-900 rounded-2xl shadow-xl space-y-3 w-80 text-white animate-fadeIn'
    : 'absolute left-0 mt-2 z-50 p-4 border border-zinc-200 bg-white rounded-2xl shadow-xl space-y-3 w-80 text-zinc-950 animate-fadeIn';

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${buttonBaseClass} ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
      >
        <span className={value ? '' : 'text-zinc-400 font-normal'}>
          {getDisplayValue() || placeholder}
        </span>
        <Calendar className={`w-4 h-4 shrink-0 ${dark ? 'text-zinc-400' : 'text-zinc-400'}`} />
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div className={popoverBaseClass}>
          {/* Calendar Header with select dropdowns (Shadcn style fast-nav) */}
          <div className="flex items-center justify-between gap-1.5 pb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                dark 
                  ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-white' 
                  : 'border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-950'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1">
              <select
                value={month}
                onChange={handleMonthChange}
                className={`py-0.5 px-2 border-0 bg-transparent text-xs font-bold focus:ring-0 focus:outline-none pr-6 cursor-pointer ${
                  dark ? 'text-white' : 'text-zinc-900'
                }`}
                style={{ WebkitAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx} className={dark ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-950'}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={year}
                onChange={handleYearChange}
                className={`py-0.5 px-2 border-0 bg-transparent text-xs font-bold focus:ring-0 focus:outline-none pr-6 cursor-pointer ${
                  dark ? 'text-white' : 'text-zinc-900'
                }`}
                style={{ WebkitAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
              >
                {years.map((y) => (
                  <option key={y} value={y} className={dark ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-950'}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                dark 
                  ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-white' 
                  : 'border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-950'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 text-center font-semibold text-[10px] tracking-wider uppercase opacity-60">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {allGridDays.map((gridDay, idx) => {
              const isSelected = value && (() => {
                const parts = value.split('-');
                if (parts.length === 3) {
                  return (
                    parseInt(parts[0]) === year &&
                    parseInt(parts[1]) - 1 === month + gridDay.monthOffset &&
                    parseInt(parts[2]) === gridDay.day
                  );
                }
                return false;
              })();

              const isToday = (() => {
                const today = new Date();
                return (
                  today.getFullYear() === year &&
                  today.getMonth() === month + gridDay.monthOffset &&
                  today.getDate() === gridDay.day
                );
              })();

              let dayClass = 'h-9 w-9 rounded-xl flex items-center justify-center text-xs font-medium transition-all cursor-pointer ';

              if (isSelected) {
                dayClass += dark
                  ? 'bg-white text-zinc-950 font-bold shadow-sm'
                  : 'bg-zinc-950 text-white font-bold shadow-sm';
              } else if (gridDay.isCurrentMonth) {
                dayClass += dark
                  ? 'hover:bg-zinc-800 text-zinc-100'
                  : 'hover:bg-zinc-100 text-zinc-800';
                
                if (isToday) {
                  dayClass += dark
                    ? ' border border-zinc-700 font-semibold'
                    : ' border border-zinc-200 font-semibold';
                }
              } else {
                dayClass += dark
                  ? 'text-zinc-600 hover:bg-zinc-800/40'
                  : 'text-zinc-300 hover:bg-zinc-50/50';
              }

              return (
                <button
                  key={`${gridDay.day}-${gridDay.monthOffset}-${idx}`}
                  type="button"
                  onClick={() => handleSelectDay(gridDay.day, gridDay.monthOffset)}
                  className={dayClass}
                >
                  {gridDay.day}
                </button>
              );
            })}
          </div>

          {/* Quick Actions Footer */}
          <div className={`flex justify-between items-center border-t pt-2 text-[11px] font-semibold ${
            dark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-100 text-zinc-500'
          }`}>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`hover:underline cursor-pointer ${dark ? 'hover:text-white' : 'hover:text-zinc-950'}`}
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const formattedMonth = String(today.getMonth() + 1).padStart(2, '0');
                const formattedDay = String(today.getDate()).padStart(2, '0');
                onChange(`${today.getFullYear()}-${formattedMonth}-${formattedDay}`);
                setIsOpen(false);
              }}
              className={`hover:underline cursor-pointer ${dark ? 'hover:text-white' : 'hover:text-zinc-950'}`}
            >
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
