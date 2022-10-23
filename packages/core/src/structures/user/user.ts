import { User as DBUser } from ".prisma/client";

export class User {
  name: string | null;
  email: string;
  id: number;
  // eslint-disable-next-line no-unused-vars
  constructor(name: string | null, email: string, id: number) {
    this.name = name;
    this.email = email;
    this.id = id;
  }

  public static fromPrisma(data: DBUser): User {
    return new User(data.name, data.email, data.id);
  }
}
