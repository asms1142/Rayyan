type FormInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export default function FormInput({ label, ...props }: FormInputProps) {
  return (
    <div className="flex flex-col">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <input {...props} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
    </div>
  );
}
