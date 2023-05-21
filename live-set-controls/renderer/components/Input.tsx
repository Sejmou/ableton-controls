import classNames from 'classnames';
import { TextInput } from 'flowbite-react';
import { FieldProps } from 'formik';

const Input = ({
  field,
  form: { touched, errors },
  className,
  label,
  ...props
}: FieldProps & { className?: string; label?: string }) => {
  return (
    // tried to follow the custom component example from https://formik.org/docs/api/field#component
    <div className={classNames('py-2 flex flex-col', className)}>
      <label className="text-xs">{label}</label>
      <TextInput {...field} {...props} />
      {touched[field.name] && errors[field.name] && (
        <div className="error">{errors[field.name] as string}</div>
      )}
    </div>
  );
};

export default Input;
