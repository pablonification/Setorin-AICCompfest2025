import { NextResponse } from 'next/server';

export const tryJsonFetch = async (url, options = {}) => {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const json = (payload, init) => NextResponse.json(payload, init);
