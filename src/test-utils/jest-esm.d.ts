// @types/jest@30 объявляет `unstable_unmockModule`, но забыл `unstable_mockModule`,
// хотя в рантайме jest он есть (тесты с подменой ES-модулей на нём и держатся).
// Дописываем объявление сами, чтобы `npm run test:types` проходил.
declare namespace jest {
  function unstable_mockModule(moduleName: string, factory?: () => unknown): typeof jest;
}
