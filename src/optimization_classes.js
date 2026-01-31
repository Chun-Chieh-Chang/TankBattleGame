    // --- 效能優化類別 ---
    class ObjectPool {
        constructor(createFn, maxSize = 100) {
            this.createFn = createFn;
            this.pool = [];
            this.maxSize = maxSize;
        }
        get(...args) {
            const obj = this.pool.length > 0 ? this.pool.pop() : this.createFn();
            if (obj.reset) obj.reset(...args);
            return obj;
        }
        release(obj) {
            if (this.pool.length < this.maxSize) this.pool.push(obj);
        }
    }

    class SpatialGrid {
        constructor(width, height, cellSize) {
            this.cellSize = cellSize;
            this.cols = Math.ceil(width / cellSize);
            this.rows = Math.ceil(height / cellSize);
            this.grid = new Map();
        }
        clear() { this.grid.clear(); }
        getKey(c, r) { return `${c},${r}`; }
        insert(obj) {
            const startCol = Math.floor(obj.x / this.cellSize);
            const endCol = Math.floor((obj.x + obj.width) / this.cellSize);
            const startRow = Math.floor(obj.y / this.cellSize);
            const endRow = Math.floor((obj.y + obj.height) / this.cellSize);
            for (let c = startCol; c <= endCol; c++) {
                for (let r = startRow; r <= endRow; r++) {
                    const key = this.getKey(c, r);
                    if (!this.grid.has(key)) this.grid.set(key, []);
                    this.grid.get(key).push(obj);
                }
            }
        }
        retrieve(obj) {
            const startCol = Math.floor(obj.x / this.cellSize);
            const endCol = Math.floor((obj.x + obj.width) / this.cellSize);
            const startRow = Math.floor(obj.y / this.cellSize);
            const endRow = Math.floor((obj.y + obj.height) / this.cellSize);
            const candidates = new Set();
            for (let c = startCol; c <= endCol; c++) {
                for (let r = startRow; r <= endRow; r++) {
                    const key = this.getKey(c, r);
                    const cellObjects = this.grid.get(key);
                    if (cellObjects) {
                        for (const neighbor of cellObjects) {
                            if (neighbor !== obj) candidates.add(neighbor);
                        }
                    }
                }
            }
            return Array.from(candidates);
        }
    }
