export class CatalogService {
  constructor({ units, categories }) {
    this.units = units;
    this.categories = categories;
  }

  listUnits({ query = '', onlyAvailable = false } = {}) {
    return this.units.search({ query, onlyAvailable });
  }

  listCategories() {
    return this.categories.list();
  }
}
