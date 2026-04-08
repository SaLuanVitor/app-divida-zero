import React from 'react';

export type FormKeyboardContextValue = {
  onInputFocus?: (target?: number | null) => void;
};

const FormKeyboardContext = React.createContext<FormKeyboardContextValue>({});

export const FormKeyboardProvider = FormKeyboardContext.Provider;

export const useFormKeyboard = () => React.useContext(FormKeyboardContext);

