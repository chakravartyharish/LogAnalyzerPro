// NOTE: this is just here because dcrf-client uses winston for logging (why!?!?) which is using
//       "setImmediate" and that is not available "out of the box" on most browsers
// FIXME: (somehow) use webpack to apply this polyfill (or maybe use the one from corejs instead)
//        (altough the used "setimmediate" polyfill claims that this is how it should be done)
import 'setimmediate';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './app/store';
import App from './App';
import './i18n/config';

//import reportWebVitals from './reportWebVitals';
//import { ThemeProvider } from '@mui/material/styles';
//import CssBaseline from '@mui/material/CssBaseline/CssBaseline';

import './index.css';

const container = document.getElementById('root')!;
const root = createRoot(container);

document.title = process.env.REACT_APP_PERSONALITY_NAME ?? ''

root.render(
    <React.StrictMode>
      <Provider store={store}>
          <App />
      </Provider>
    </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
//reportWebVitals();
