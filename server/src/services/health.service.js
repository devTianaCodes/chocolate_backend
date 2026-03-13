export async function healthService() {
  return { status: 'ok', timestamp: new Date().toISOString() };
}
