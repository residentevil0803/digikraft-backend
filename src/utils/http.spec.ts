import { handleAxiosError } from './http';

describe('utils', () => {
  test('handleAxiosError', () => {
    let serverResponded = {
      response: {
        status: '404',
        data: 'Not Found',
      },
    };

    let url = 'https://fake.url';

    expect(() => handleAxiosError(serverResponded, url)).toThrow(
      new Error(
        `${url} responded with: ${serverResponded.response.status} - ${serverResponded.response.data}`,
      ),
    );

    let serverFailedToRespond = {
      request: {},
    };

    expect(() => handleAxiosError(serverFailedToRespond, url)).toThrow(
      new Error(`${url} failed to respond`),
    );

    let requestNotSent = 'Connection pool exhausted';
    expect(() => handleAxiosError(requestNotSent, url)).toThrow(
      new Error(`Couldn't make request to ${url}: ${requestNotSent}`),
    );
  });
});
