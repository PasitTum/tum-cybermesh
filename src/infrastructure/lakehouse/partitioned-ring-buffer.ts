export class PartitionedRingBuffer<T> {
  private readonly buffer: (T | undefined)[];
  private head: number = 0;
  private tail: number = 0;
  private count: number = 0;

  constructor(public readonly capacity: number = 50000) {
    if (capacity <= 0) throw new Error('Capacity must be positive');
    this.buffer = new Array<T | undefined>(capacity);
  }

  public push(item: T): boolean {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;

    if (this.count < this.capacity) {
      this.count++;
      return false; // Did not overwrite
    } else {
      // Overwrote oldest item
      this.head = (this.head + 1) % this.capacity;
      return true;
    }
  }

  public pushBatch(items: T[]): number {
    let overwrites = 0;
    for (const item of items) {
      if (this.push(item)) overwrites++;
    }
    return overwrites;
  }

  public toArray(): T[] {
    const result: T[] = [];
    let idx = this.head;
    for (let i = 0; i < this.count; i++) {
      const item = this.buffer[idx];
      if (item !== undefined) result.push(item);
      idx = (idx + 1) % this.capacity;
    }
    return result;
  }

  public size(): number {
    return this.count;
  }

  public clear(): void {
    this.buffer.fill(undefined);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }
}
