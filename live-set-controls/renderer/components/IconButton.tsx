import React from "react";

type Props = {
  className?: string;
  children: React.ReactNode;
  onClick: () => void;
};

const IconButton = (props: Props) => {
  return (
    <button className={props.className} onClick={props.onClick}>
      {props.children}
    </button>
  );
};

export default IconButton;
