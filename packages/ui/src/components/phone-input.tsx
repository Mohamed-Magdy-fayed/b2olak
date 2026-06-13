"use client";

import { type ComponentProps, memo, useCallback, useMemo } from "react";
import PhoneInputLib, { type Country } from "react-phone-number-input";

import { cn } from "@workspace/ui/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@workspace/ui/components/select";

const COUNTRIES: Country[] = [
  "EG", "SA", "AE", "KW", "QA", "BH", "OM", "JO", "LB", "IQ",
  "SY", "LY", "DZ", "TN", "MA", "YE",
];

function PhoneInputField({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      {...props}
      dir="ltr"
      className={cn(
        // No border/rounding here — the container owns the single rounded
        // border. dir="ltr" keeps the digits LTR without flipping any box
        // logical props (we use none on this element).
        "h-9 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    />
  );
}

const CountrySelector = memo(function CountrySelector({
  value,
  onChange,
  options,
  iconComponent,
}: {
  value: string;
  onChange: (val?: string) => void;
  options: { value?: Country; label: string; divider?: boolean }[];
  iconComponent?: (props: { country: Country }) => React.ReactNode;
}) {
  const items = options.filter(
    (o): o is { value: Country; label: string } => !o.divider && Boolean(o.value),
  );

  return (
    <Select
      value={value ?? ""}
      onValueChange={(v) => { if (v) onChange(v); }}
    >
      <SelectTrigger className="h-9! w-[80px] shrink-0 gap-1 rounded-none border-0 border-e border-input bg-transparent px-2">
        <span className="flex items-center gap-1 overflow-hidden">
          {value && iconComponent?.({ country: value as Country })}
          <span className="text-xs font-medium">{value}</span>
        </span>
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        {items.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

export interface PhoneInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function PhoneInput({
  value,
  onChange,
  placeholder,
  disabled,
  id,
  className,
}: PhoneInputProps) {
  const formatted = useMemo(
    () => (value ? (value.startsWith("+") ? value : `+${value}`) : undefined),
    [value],
  );

  const handleChange = useCallback(
    (val: string | undefined) => {
      if (!val) { onChange(""); return; }
      onChange(val.startsWith("+") ? val.slice(1) : val);
    },
    [onChange],
  );

  return (
    <PhoneInputLib
      className={cn(
        "border-input flex w-full items-stretch overflow-hidden rounded-md border bg-transparent shadow-xs transition-[color,box-shadow] dark:bg-input/30",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        "has-disabled:pointer-events-none has-disabled:opacity-50",
        className,
      )}
      value={formatted}
      onChange={handleChange}
      defaultCountry="EG"
      countries={COUNTRIES}
      inputComponent={PhoneInputField}
      countrySelectComponent={CountrySelector}
      disabled={disabled}
      placeholder={placeholder}
      numberInputProps={{ id }}
      addInternationalOption={false}
      limitMaxLength
      initialValueFormat="national"
      unicodeFlags
    />
  );
}
