// NOTE: we do not use "testing-library" (does not really work as expected with our setup)

import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from './app/store';
import App from './App';

/*
test('renders learn react link', () => {
  const { getByText } = render(
    <Provider store={store}>
      <App />
    </Provider>
  );

  expect(getByText(/learn/i)).toBeInTheDocument();
});
*/

test('nothing', () => {
  // just an empty test (else the test file would fail, keep it as documentation in case we ever want / need testing-library ...)
});