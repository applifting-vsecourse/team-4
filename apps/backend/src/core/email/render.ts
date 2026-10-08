import * as React from 'react';
import { render } from 'react-email';

export const renderEmail = async <TProps extends object>(
  Component: React.ComponentType<TProps>,
  props: TProps,
): Promise<string> => render(React.createElement(Component, props));
