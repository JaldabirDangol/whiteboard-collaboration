type LinkedListNode<K, V> = {
  key: K;
  value: V;
  prev: LinkedListNode<K, V> | null;
  next: LinkedListNode<K, V> | null;
};

export class LRUCache<K, V> {
  private capacity: number;
  private map: Map<K, LinkedListNode<K, V>>;
  private head: LinkedListNode<K, V> | null;
  private tail: LinkedListNode<K, V> | null;
  private onEvict: ((key: K, value: V) => void) | null;

  constructor(capacity: number, onEvict?: (key: K, value: V) => void) {
    this.capacity = capacity;
    this.map = new Map();
    this.head = null;
    this.tail = null;
    this.onEvict = onEvict ?? null;
  }

  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;
    this.moveToHead(node);
    return node.value;
  }

  set(key: K, value: V): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this.moveToHead(existing);
      return;
    }

    const node: LinkedListNode<K, V> = { key, value, prev: null, next: null };
    this.map.set(key, node);
    this.prepend(node);

    if (this.map.size > this.capacity) {
      this.evictTail();
    }
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  delete(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;
    this.removeNode(node);
    this.map.delete(key);
    return true;
  }

  keys(): K[] {
    return Array.from(this.map.keys());
  }

  get size(): number {
    return this.map.size;
  }

  private moveToHead(node: LinkedListNode<K, V>): void {
    if (node === this.head) return;
    this.removeNode(node);
    this.prepend(node);
  }

  private prepend(node: LinkedListNode<K, V>): void {
    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  private removeNode(node: LinkedListNode<K, V>): void {
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (node === this.head) this.head = node.next;
    if (node === this.tail) this.tail = node.prev;
    node.prev = null;
    node.next = null;
  }

  private evictTail(): void {
    if (!this.tail) return;
    const key = this.tail.key;
    const value = this.tail.value;
    this.removeNode(this.tail);
    this.map.delete(key);
    this.onEvict?.(key, value);
  }
}
