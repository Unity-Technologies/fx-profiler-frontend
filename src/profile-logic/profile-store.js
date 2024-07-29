/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow
import { oneLine } from 'common-tags';
import { PROFILER_SERVER_ORIGIN } from 'firefox-profiler/app-logic/constants';

// This is the server we use to publish new profiles.
const PUBLISHING_ENDPOINT = `${PROFILER_SERVER_ORIGIN}/compressed-store`;
const PUBLISHING_URL_REQUEST_ENDPOINT = `${PROFILER_SERVER_ORIGIN}/compressed-store-url`;

const ACCEPT_HEADER_VALUE = 'application/vnd.firefox-profiler+json;version=1.0';

// This error is used when we get an "abort" event. This happens when we call
// "abort" expliitely, and so when the user actually cancels the upload.
// We use a specific class error to distinguish this case from other cases from
// the caller function.
// It's exported because we use it in tests.
export class UploadAbortedError extends Error {
  name = 'UploadAbortedError';
}

export function uploadBinaryProfileData() {
  // Try using compressed-sture-url to fetch a URL; if it fails or returns an error,
  // then go back to the Direct upload method.
  try {
    return uploadBinaryProfileIndirect();
  } catch (e) {
    console.warning('uploadBinaryProfileIndirect() failed, using uploadBinaryProfileDirect()', e);
  }

  return uploadBinaryProfileDataDirect();
}

// Configure the given xhr request for the profile upload.
// If overrideSuccessReponse is specified, it is used as the success resolve value;
// otherwise, the response to the xhr is.
// This code is shared by both paths.
function configureXhrForUpload(xhr: XMLHttpRequest, resolve, reject, overrideSuccessResponse?: string = null) {
  xhr.onload = () => {
    switch (xhr.status) {
      case 413:
        reject(
          new Error(
            oneLine`
              The profile size is too large.
              You can try enabling some of the privacy features to trim its size down.
            `
          )
        );
        break;
      default:
        if (xhr.status >= 200 && xhr.status <= 299) {
          // Success!
          if (overrideSuccessResponse !== null) {
            resolve(overrideSuccessResponse);
          } else {
            resolve(xhr.responseText);
          }
        } else {
          reject(
            new Error(
              `xhr onload with status != 200, xhr.statusText: ${xhr.statusText}`
            )
          );
        }
    }
  };

  xhr.onerror = () => {
    console.error(
      'There was an XHR network error in uploadBinaryProfileData()',
      xhr
    );

    let errorMessage =
      'Unable to make a connection to publish the profile.';
    if (xhr.statusText) {
      errorMessage += ` The error response was: ${xhr.statusText}`;
    }
    reject(new Error(errorMessage));
  };

  xhr.onabort = () => {
    reject(
      new UploadAbortedError('The upload has been aborted by the user.')
    );
  };
}

function uploadBinaryProfileIndirect() {
  const xhr = new XMLHttpRequest();
  let isAborted = false;

  return {
    abortUpload: (): void => {
      isAborted = true;
      xhr.abort();
    },
    startUpload: (
      data: $TypedArray,
      progressChangeCallback?: (number) => mixed
    ): Promise<string> =>
      new Promise((resolve, reject) => {
        if (isAborted) {
          reject(new UploadAbortedError('The request was already aborted.'));
          return;
        }

        fetch(PUBLISHING_URL_REQUEST_ENDPOINT).then((r) => {
          if (!r.ok) {
            console.error('Error fetching URL to publish profile', r);
            reject(new Error('Error fetching URL to publish profile'));
            return;
          }

          r.json().then((urlData) => {
            let jwt = urlData.jwt;
            let uploadUrl = urlData.url;

            configureXhrForUpload(xhr, resolve, reject, jwt);

            xhr.upload.onprogress = (e) => {
              if (progressChangeCallback && e.lengthComputable) {
                progressChangeCallback(e.loaded / e.total);
              }
            };

            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', 'application/vnd.firefox-profiler+json');
            xhr.send(data);
          }).catch((e) => {
            console.error('Error parsing JSON from URL to publish profile', e);
            reject(e);
          });
        }).catch((e) => {
          console.error('Error fetching URL to publish profile', e);
          reject(e);
        });
      }),
  };
}

function uploadBinaryProfileDataDirect() {
  const xhr = new XMLHttpRequest();
  let isAborted = false;

  return {
    abortUpload: (): void => {
      isAborted = true;
      xhr.abort();
    },
    startUpload: (
      data: $TypedArray,
      progressChangeCallback?: (number) => mixed
    ): Promise<string> =>
      new Promise((resolve, reject) => {
        if (isAborted) {
          reject(new UploadAbortedError('The request was already aborted.'));
          return;
        }

        configureXhrForUpload(xhr, resolve, reject);

        xhr.upload.onprogress = (e) => {
          if (progressChangeCallback && e.lengthComputable) {
            progressChangeCallback(e.loaded / e.total);
          }
        };

        xhr.open('POST', PUBLISHING_ENDPOINT);
        xhr.setRequestHeader('Accept', ACCEPT_HEADER_VALUE);
        xhr.send(data);
      }),
  };
}

export async function deleteProfileOnServer({
  profileToken,
  jwtToken,
}: {
  profileToken: string,
  jwtToken: string,
}): Promise<void> {
  const ENDPOINT = `${PROFILER_SERVER_ORIGIN}/profile/${profileToken}`;

  const response = await fetch(ENDPOINT, {
    method: 'DELETE',
    headers: {
      Accept: ACCEPT_HEADER_VALUE,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwtToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `An error happened while deleting the profile with the token "${profileToken}": ${response.statusText} (${response.status})`
    );
  }
}
