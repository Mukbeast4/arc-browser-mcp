export interface HasId {
  id: number;
}

export class RingBuffer<T extends HasId> {
  private items: T[] = [];
  private counter = 0;

  constructor(private cap: number) {}

  push(item: T): number {
    item.id = this.counter++;
    this.items.push(item);
    if (this.items.length > this.cap) this.items.shift();
    return item.id;
  }

  getById(id: number): T | undefined {
    return this.items.find((i) => i.id === id);
  }

  slice(offset: number, limit: number, filter?: (item: T) => boolean): { items: T[]; total: number } {
    const list = filter ? this.items.filter(filter) : this.items;
    return { items: list.slice(offset, offset + limit), total: list.length };
  }

  get size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
    this.counter = 0;
  }
}
