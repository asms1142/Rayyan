type FormSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: { value: string | number; label: string }[];
};

export default function FormSelect({ label, options, ...props }: FormSelectProps) {
  return (
    <div className="flex flex-col">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <select {...props} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
