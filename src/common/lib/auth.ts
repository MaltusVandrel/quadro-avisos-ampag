const secretKey = process.env.JWT_SECRET;

if (!secretKey) {
  throw new Error('JWT_SECRET is not defined. Please set it in your .env file.');
}

const key = new TextEncoder().encode(secretKey);

type JoseModule = typeof import('jose');
let josePromise: Promise<JoseModule> | null = null;

function getJose(): Promise<JoseModule> {
  if (!josePromise) {
    josePromise = import('jose');
  }
  return josePromise;
}

export async function encrypt(payload: Record<string, unknown>) {
  const { SignJWT } = await getJose();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2w')
    .sign(key);
}

export async function decrypt(input: string): Promise<Record<string, unknown>> {
  const { jwtVerify } = await getJose();
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  });
  return payload;
}
