import { BitField } from "@sapphire/bitfield";

export const UserServerSettingsFlags = {
  ALLOWED_TO_SHOW_MESSAGES: 1 << 0,
  SERVER_DISABLE_INDEXING: 1 << 1,
};

export class PermissionsBitField<Flags extends Record<string, number>> extends BitField<Flags> {
  // eslint-disable-next-line no-unused-vars
  constructor(flags: Readonly<Flags>, public value: number) {
    super(flags);
  }

  public checkFlag(flag: keyof Flags) {
    return new BitField(this.flags).has(this.value, flag as string);
  }
  public setFlag(flag: keyof Flags) {
    this.value = new BitField(this.flags).resolve([this.value, flag as string]);
  }
  public clearFlag(flag: keyof Flags) {
    this.value = new BitField(this.flags).intersection(
      this.value,
      new BitField(this.flags).complement(flag as string)
    );
  }
}

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
