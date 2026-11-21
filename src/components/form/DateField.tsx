import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import type { Instance } from "flatpickr/dist/types/instance";
import "flatpickr/dist/flatpickr.css";
import { CalenderIcon } from "../../icons";

interface Props {
  /** "YYYY-MM-DD", or "" when empty */
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
}

/**
 * Controlled date input with a flatpickr calendar popup.
 * Values are plain "YYYY-MM-DD" strings, the same as `<input type="date">`.
 */
export default function DateField({
  value,
  onChange,
  className = "",
  placeholder = "Select date",
  id,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<Instance | null>(null);
  // Always call the latest onChange without re-creating the picker.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!inputRef.current) return;
    const picker = flatpickr(inputRef.current, {
      static: true,
      monthSelectorType: "static",
      dateFormat: "Y-m-d",
      disableMobile: true,
      defaultDate: value || undefined,
      onChange: (_dates, dateStr) => onChangeRef.current(dateStr),
    });
    pickerRef.current = picker;
    return () => {
      picker.destroy();
      pickerRef.current = null;
    };
    // The picker is created once; later value changes are synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the calendar in step when the form resets or loads a record to edit.
  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;
    if (value) {
      if (picker.input.value !== value) picker.setDate(value, false);
    } else {
      picker.clear(false);
    }
  }, [value]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        readOnly
        placeholder={placeholder}
        className={`cursor-pointer pr-10 ${className}`}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
        <CalenderIcon className="size-5" />
      </span>
    </div>
  );
}
