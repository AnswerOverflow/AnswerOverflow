export class User {
  public id: string;
  public name: string;
  public email: string;
  public password: string;
  public created: Date;
  public updated: Date;
  // eslint-disable-next-line no-unused-vars
  constructor(data: any) {
    this.id = "1";
    this.name = "John Doe";
    this.email = "rhys@example.com";
    this.password = "password";
    this.created = new Date();
    this.updated = new Date();
  }
}
