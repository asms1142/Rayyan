import React, { forwardRef, InputHTMLAttributes } from 'react';

type FormInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, className, ...props }, ref) => {
    return (
      <div className="flex flex-col">
        {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
        <input
          {...props}
          ref={ref}
          className={`mt-1 block w-full border border-gray-300 rounded-md p-2 ${className || ''}`}
        />
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';
export default FormInput;
