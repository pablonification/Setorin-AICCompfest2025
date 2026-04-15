export const LOCAL_DEV_ISSUER = 'setorin-local-dev';

export const decodeJwtPayload = (token) => {
  if (!token) return null;

  try {
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) return null;

    if (typeof window === 'undefined') {
      return JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf-8'));
    }

    return JSON.parse(atob(tokenParts[1]));
  } catch {
    return null;
  }
};

export const isLocalDevToken = (token) => decodeJwtPayload(token)?.iss === LOCAL_DEV_ISSUER;
