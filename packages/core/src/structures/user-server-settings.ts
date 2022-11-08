export const UserServerSettingsFlags = {
  ALLOWED_TO_SHOW_MESSAGES: 1 << 0,
  SERVER_DISABLE_INDEXING: 1 << 1,
};

export class UserServerSettings {
  // eslint-disable-next-line no-unused-vars
  constructor(public permissions: number = 0) {}
  public giveConsent() {
    this.permissions = 1;
  }
  public getConsentGranted() {
    return this.permissions === 1;
  }
}
