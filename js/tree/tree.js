class TreeManager {
    constructor() {
        this.treeData = null;
    }

    initialize(initialData) {
        this.treeData = initialData;
    }

    getTreeData() {
        return this.treeData;
    }

    findNodeById(nodeId, node = this.treeData) {
        if (node.id === nodeId) {
            return node;
        }
        
        if (node.children) {
            for (let child of node.children) {
                const found = this.findNodeById(nodeId, child);
                if (found) return found;
            }
        }
        return null;
    }

    addNode(parentId, newNode) {
        const parent = this.findNodeById(parentId);
        if (parent) {
            parent.children = parent.children || [];
            parent.children.push(newNode);
            return true;
        }
        return false;
    }

    updateNode(nodeId, updates) {
        const node = this.findNodeById(nodeId);
        if (node) {
            Object.assign(node, updates);
            return true;
        }
        return false;
    }

    deleteNode(nodeId, parentNode = this.treeData) {
        if (parentNode.children) {
            const index = parentNode.children.findIndex(child => child.id === nodeId);
            if (index !== -1) {
                parentNode.children.splice(index, 1);
                return true;
            }
            
            for (let child of parentNode.children) {
                if (this.deleteNode(nodeId, child)) {
                    return true;
                }
            }
        }
        return false;
    }
}

// Create and initialize the tree manager with data from init_tree.js
const treeManager = new TreeManager();
treeManager.initialize(init_tree);

// Export the tree manager instance
window.treeManager = treeManager;
