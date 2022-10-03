export class TreeNode<T> {
    value: T;
    parent: TreeNode<T> | null;
    children: TreeNode<T>[];

    constructor(value: T, parent: TreeNode<T> | null = null) {
        this.value = value;
        this.parent = parent;
        this.children = [];
    }

    addChild(child: TreeNode<T>) {
        this.children.push(child);
    }

    removeChild(child: TreeNode<T>) {
        this.children = this.children.filter(c => c !== child);
    }

    traverseDepthFirst(callback: (node: TreeNode<T>) => void) {
        callback(this);
        this.children.forEach(c => c.traverseDepthFirst(callback));
    }

    traverseBreadthFirst(callback: (node: TreeNode<T>) => void) {
        const queue: TreeNode<T>[] = [this];
        while (queue.length > 0) {
            const node = queue.shift();
            if (node) {
                callback(node);
                queue.push(...node.children);
            }
        }
    }
}


export class Tree<T> {
    root: TreeNode<T>;

    constructor(rootValue: T) {
        this.root = new TreeNode(rootValue);
    }

    searchDepthFirst(callback: (node: TreeNode<T>) => boolean): TreeNode<T> | null {
        let result: TreeNode<T> | null = null;
        this.traverseDepthFirst(node => {
            if (callback(node)) {
                result = node;
            }
        });
        return result;
    };

    traverseDepthFirst(callback: (node: TreeNode<T>) => void) {
        this.root.traverseDepthFirst(callback);
    }

    traverseBreadthFirst(callback: (node: TreeNode<T>) => void) {
        this.root.traverseBreadthFirst(callback);
    }
}