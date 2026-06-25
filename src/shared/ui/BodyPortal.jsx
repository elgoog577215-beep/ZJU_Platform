import { createPortal } from 'react-dom';

const BodyPortal = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

export default BodyPortal;
