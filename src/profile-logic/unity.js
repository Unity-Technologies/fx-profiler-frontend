/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import type {
    ScreenshotPayload,
    Profile,
    Thread,
    ThreadIndex,
    Pid,
    GlobalTrack,
    LocalTrack,
    TrackIndex,
    Counter,
    Tid,
    TrackReference,
    MarkerSchemaByName,
  } from 'firefox-profiler/types';
  
import { defaultThreadOrder, getFriendlyThreadName } from './profile-data';
import { computeMaxCPUDeltaPerInterval } from './cpu';
import { intersectSets, subtractSets } from '../utils/set';
import { splitSearchString, stringsToRegExp } from '../utils/string';
import { ensureExists, assertExhaustiveCheck } from '../utils/flow';
import { getMarkerSchemaName } from './marker-schema';

export function unityIsEssentialThread(thread: Thread): boolean {
    return false;
}

export function unityIsInterestingThread(thread: Thread): boolean {
    return false;
}