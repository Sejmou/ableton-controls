import classNames from 'classnames';

type Props = {
  className?: string;
  icon?: React.ReactNode;
  label?: string;
  onClick: () => void;
};

const Button = (props: Props) => {
  return (
    <button
      className={classNames(
        'flex p-2 gap-2 border rounded items-center hover:bg-gray-100',
        props.className
      )}
      onClick={props.onClick}
    >
      {props.icon}
      {props.label && <span>{props.label}</span>}
    </button>
  );
};

export default Button;
