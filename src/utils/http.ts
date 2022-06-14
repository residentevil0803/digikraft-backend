export function handleAxiosError(err, url: string) {
  if (err.response) {
    const serverResponse = err.response;
    throw new Error(
      `${url} responded with: ${serverResponse.status} - ${serverResponse.data}`,
    );
  } else if (err.request) {
    throw new Error(`${url} failed to respond`);
  } else {
    throw new Error(`Couldn't make request to ${url}: ${err}`);
  }
}
