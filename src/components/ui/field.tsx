import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

type FieldShellProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
};

export function FieldShell({
  label,
  htmlFor,
  hint,
  children,
}: FieldShellProps) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> &
  Omit<FieldShellProps, "children" | "htmlFor"> & { id: string };

export function InputField({ label, hint, id, ...props }: InputFieldProps) {
  return (
    <FieldShell label={label} hint={hint} htmlFor={id}>
      <input id={id} {...props} />
    </FieldShell>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> &
  Omit<FieldShellProps, "children" | "htmlFor"> & {
    id: string;
    children: ReactNode;
  };

export function SelectField({
  label,
  hint,
  id,
  children,
  ...props
}: SelectFieldProps) {
  return (
    <FieldShell label={label} hint={hint} htmlFor={id}>
      <select id={id} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}
