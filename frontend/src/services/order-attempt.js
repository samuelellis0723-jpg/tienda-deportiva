export function createOrderAttempt(send, createKey = () => crypto.randomUUID()) {
  let snapshot = null;
  let pending = null;
  return {
    get snapshot() { return snapshot; },
    run(payload) {
      if (pending) return pending;
      snapshot ??= { key: createKey(), payload: structuredClone(payload) };
      pending = Promise.resolve().then(() => send(snapshot.payload, snapshot.key)).then(result => {
        snapshot = null;
        return result;
      }).catch(error => {
        if (error.status >= 400 && error.status < 500) snapshot = null;
        throw error;
      }).finally(() => { pending = null; });
      return pending;
    },
  };
}
