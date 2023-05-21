import classNames from 'classnames';

type Props = {
  className?: string;
  icon?: React.ReactNode;
  label?: string;
  type?: 'button' | 'submit';
  onClick?: () => void;
};

const Button = (props: Props) => {
  return (
    <button
      className={classNames(
        'flex p-2 gap-2 border rounded items-center justify-center hover:bg-gray-100',
        props.className
      )}
      onClick={props.onClick}
      type={props.type}
    >
      {props.icon}
      {props.label && <span>{props.label}</span>}
    </button>
  );
};

export default Button;
