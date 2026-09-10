import 'server-only';

export class PortalError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
    this.name = 'PortalError';
  }
}
