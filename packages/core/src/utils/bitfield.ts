import { BitField } from "@sapphire/bitfield";

export function changeFlag<T extends Record<string, number>>(
  flags: T,
  current_permissions: number,
  active: boolean,
  flag: keyof T
) {
  const new_permissions = new PermissionsBitField<T>(flags, current_permissions);
  if (active) {
    new_permissions.setFlag(flag);
  } else {
    new_permissions.clearFlag(flag);
  }
  return new_permissions;
}

export function addBitfield<Flags extends Record<string, number>, Data extends Record<any, any>>(
  flags: Flags,
  permissions: number,
  data: Data
) {
  const bitfield = new PermissionsBitField<Flags>(flags, permissions);
  return {
    bitfield: bitfield,
    ...data,
  };
}

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
