/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import { createStore, applyMiddleware } from 'redux';
import { thunk } from 'redux-thunk';
import { createLogger } from 'redux-logger';
import reducers from 'firefox-profiler/reducers';
import type { Store } from 'firefox-profiler/types';

import { attemptToPublish } from 'firefox-profiler/actions/publish';

// I hate this Redux garbage and I am tired of fighting with it to do
// things the "right" way. Javascript was a mistake.
const autoUploadMiddleware = ({ dispatch }) => next => action => {
  next(action);

  if (location.search.indexOf('autoUploadReplyUrl') > 0 && action.type === 'DONE_SYMBOLICATING') {
      dispatch(attemptToPublish());
  }
};

/**
 * Isolate the store creation into a function, so that it can be used outside of the
 * app's execution context, e.g. for testing.
 * @return {object} Redux store.
 */
export default function initializeStore(): Store {
  const middlewares = [thunk, autoUploadMiddleware];

  if (process.env.NODE_ENV === 'development') {
    middlewares.push(
      createLogger({
        collapsed: true,
        titleFormatter: (action, time, duration) =>
          `[action]    ${action.type} (in ${duration.toFixed(2)} ms)`,
        logErrors: false,
        duration: true,
      })
    );
  }

  const store = createStore(reducers, applyMiddleware(...middlewares));

  return store;
}
