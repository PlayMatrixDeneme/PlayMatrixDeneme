/* PlayMatrix shared socket safety helpers for online games. */
export function emitSocketIfConnected(socket, eventName = '', payload = undefined) {
  try {
    if (!socket || typeof socket.emit !== 'function') return false;
    socket.emit(eventName, payload);
    return true;
  } catch (_) {
    return false;
  }
}

export function safeDisconnectSocket(socket) {
  try {
    socket?.removeAllListeners?.();
    socket?.disconnect?.();
    socket?.close?.();
    return true;
  } catch (_) {
    return false;
  }
}

export function bindSocketEvent(socket, eventName = '', handler = null) {
  if (!socket || typeof socket.on !== 'function' || typeof handler !== 'function') return () => {};
  socket.on(eventName, handler);
  return () => {
    try { socket.off?.(eventName, handler); } catch (_) {}
  };
}
