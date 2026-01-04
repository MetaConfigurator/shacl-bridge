export class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  includes(item: T): boolean {
    return this.items.includes(item);
  }

  replaceTop(item: T): void {
    this.pop();
    this.push(item);
  }
}
