declare module "userProvider" {
  interface UserProvider {
    get(): User;
  }
  const userProvider: UserProvider;
  export = userProvider;
}
