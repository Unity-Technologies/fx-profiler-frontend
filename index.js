import React from 'react';
import Perf from 'react-addons-perf';
import { render } from 'react-dom';
import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import createLogger from 'redux-logger';
import reducers from './src/content/reducers';
import Root from './src/content/containers/Root';
import threadDispatcher from './src/common/thread-middleware';
import messages from './src/content/messages';
import handleMessages from './src/common/message-handler';
import { redirectLegacyUrls } from './src/content/cleopatra-legacy-urls';
import CleopatraWorker from 'worker-loader!./src/worker';

import './res/style.css';

if (process.env.NODE_ENV === 'production') {
  require('offline-plugin/runtime').install();
}

redirectLegacyUrls();

window.geckoProfilerPromise = new Promise(function (resolve) {
  window.connectToGeckoProfiler = resolve;
});

const worker = new CleopatraWorker();

const store = createStore(
  combineReducers(Object.assign({}, reducers, {
    worker,
  })),
  applyMiddleware(...[
    thunk,
    threadDispatcher(worker, 'toWorker'),
    process.env.NODE_ENV === 'development'
      ? createLogger({titleFormatter: action => `content action ${action.type}`})
      : null,
  ].filter(fn => fn)));

handleMessages(worker, store, messages);

render(
  <Root store={store} />,
  document.getElementById('root')
);

window.Perf = Perf;
