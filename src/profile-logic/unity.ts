/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { RawThread } from 'firefox-profiler/types';

export function unityIsEssentialThread(_thread: RawThread): boolean {
  return false;
}

export function unityIsInterestingThread(_thread: RawThread): boolean {
  return false;
}
