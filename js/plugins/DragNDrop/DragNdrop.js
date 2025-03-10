/**
 * DragNDropPlugin - плагин для перетаскивания узлов дерева
 * Позволяет захватывать и перемещать узлы с дочерними элементами
 */
class DragNDropPlugin {
    constructor() {
        this.core = null;
        this.draggedNode = null;
        this.draggedElement = null;
        this.draggedNodeId = null;
        this.draggedNodeClone = null;
        this.dropTargetId = null;
        this.dropPosition = null; // 'before', 'after', 'inside'
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.isDragging = false;
        this.dragThreshold = 5; // Минимальное расстояние для начала перетаскивания
        this.lastIndicator = null;
    }

    init(core) {
        this.core = core;
        core.logger.log('DragNDropPlugin: инициализирован');

        // Регистрация модуля
        core.registerModule('dragNDrop', {
            moveNode: (nodeId, targetId, position) => this.moveNode(nodeId, targetId, position)
        });

        // Подписка на события
        core.events.on('command', (data) => {
            if (data.command === 'moveNode') {
                this.moveNode(data.nodeId, data.targetId, data.position);
            }
        });

        // Добавляем стили для плагина
        this.addStyles();
        
        // Устанавливаем обработчики событий
        this.setupEventListeners();
    }

    /**
     * Добавление стилей для плагина
     */
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .tree-node {
                user-select: none; /* Запрещаем выделение текста при перетаскивании */
            }
            .tree-node.dragging {
                opacity: 0.5;
                pointer-events: none;
            }
            .tree-node.drag-over-top {
                border-top: 2px solid #4285f4;
            }
            .tree-node.drag-over-bottom {
                border-bottom: 2px solid #4285f4;
            }
            .tree-node.drag-over-inside > .node-content {
                background-color: rgba(66, 133, 244, 0.2);
            }
            .drag-clone {
                position: absolute;
                pointer-events: none;
                opacity: 0.8;
                z-index: 1000;
                background-color: #f8f9fa;
                padding: 8px;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                max-width: 300px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .drop-indicator {
                position: absolute;
                height: 2px;
                background-color: #4285f4;
                z-index: 999;
                pointer-events: none;
            }
            .drop-indicator::before {
                content: '';
                position: absolute;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: #4285f4;
                left: -4px;
                top: -3px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Установка обработчиков событий
     */
    setupEventListeners() {
        // Получаем контейнер дерева
        const treeContainer = document.getElementById('tree');
        if (!treeContainer) return;
        
        // Привязываем контекст к обработчикам заранее, чтобы избежать проблем
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);

        // Обработчик нажатия кнопки мыши
        treeContainer.addEventListener('mousedown', (e) => {
            // Проверяем, что нажата левая кнопка мыши
            if (e.button !== 0) return;
            
            // Находим ближайший элемент узла дерева, на котором произошло нажатие
            const nodeContent = e.target.closest('.node-content');
            if (!nodeContent) return;
            
            // Получаем элемент узла
            const nodeElement = nodeContent.closest('.tree-node');
            if (!nodeElement) return;
            
            // Получаем ID узла
            const nodeId = nodeElement.dataset.nodeId;
            if (!nodeId) return;
            
            // Не позволяем перетаскивать корневой элемент
            const treeManager = this.core.getModule('treeManager');
            const node = treeManager.findNodeById(nodeId);
            if (node && node.type === 'Root') return;
            
            // Запоминаем начальные координаты
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            
            // Запоминаем элемент для перетаскивания
            this.draggedNodeId = nodeId;
            this.draggedNode = node;
            this.draggedElement = nodeElement;
            
            // Активируем узел при начале перетаскивания
            const activateItem = this.core.getModule('activateItem');
            if (activateItem) {
                activateItem.activateNode(nodeId);
            }
            
            // Добавляем обработчики для отслеживания перемещения и отпускания кнопки мыши
            document.addEventListener('mousemove', this.handleMouseMove);
            document.addEventListener('mouseup', this.handleMouseUp);
            
            // Предотвращаем выделение текста при перетаскивании
            e.preventDefault();
        });
    }

    /**
     * Обработчик перемещения мыши
     */
    handleMouseMove(e) {
        // Если не начато перетаскивание, проверяем, превышен ли порог
        if (!this.isDragging) {
            const dx = Math.abs(e.clientX - this.dragStartX);
            const dy = Math.abs(e.clientY - this.dragStartY);
            
            // Если перемещение превышает порог, начинаем перетаскивание
            if (dx > this.dragThreshold || dy > this.dragThreshold) {
                this.startDragging(e);
            }
            return;
        }
        
        // Обновляем положение клона
        if (this.draggedNodeClone) {
            this.draggedNodeClone.style.left = (e.clientX + 10) + 'px';
            this.draggedNodeClone.style.top = (e.clientY + 10) + 'px';
        }
        
        // Находим целевой элемент под курсором
        this.findDropTarget(e);
    }

    /**
     * Обработчик отпускания кнопки мыши
     */
    handleMouseUp(e) {
        // Удаляем обработчики событий
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        
        // Если перетаскивание не начато, не делаем ничего
        if (!this.isDragging) {
            this.resetDragState();
            return;
        }
        
        // Отладочная информация
        console.log('Завершение перетаскивания', {
            draggedNodeId: this.draggedNodeId,
            dropTargetId: this.dropTargetId,
            dropPosition: this.dropPosition
        });
        
        // Выполняем перемещение узла, если есть цель
        if (this.dropTargetId && this.draggedNodeId) {
            this.moveNode(this.draggedNodeId, this.dropTargetId, this.dropPosition);
        }
        
        // Удаляем визуальные элементы перетаскивания
        this.cleanupDragVisuals();
        
        // Сбрасываем состояние перетаскивания
        this.resetDragState();
    }

    /**
     * Начало операции перетаскивания
     */
    startDragging(e) {
        this.isDragging = true;
        
        // Добавляем класс перетаскивания к элементу
        if (this.draggedElement) {
            this.draggedElement.classList.add('dragging');
        }
        
        // Создаем клон элемента для визуального отображения перетаскивания
        this.createDragClone(e);
        
        console.log('Начало перетаскивания:', this.draggedNodeId);
    }

    /**
     * Создание клона элемента для визуального отображения перетаскивания
     */
    createDragClone(e) {
        if (!this.draggedNode) return;
        
        // Создаем клон
        const clone = document.createElement('div');
        clone.className = 'drag-clone';
        clone.textContent = this.draggedNode.text + ' [' + this.draggedNode.type + ']';
        
        // Устанавливаем начальную позицию
        clone.style.left = (e.clientX + 10) + 'px';
        clone.style.top = (e.clientY + 10) + 'px';
        
        // Добавляем в DOM
        document.body.appendChild(clone);
        
        // Сохраняем ссылку на клон
        this.draggedNodeClone = clone;
    }

    /**
     * Поиск целевого элемента для сброса
     */
    findDropTarget(e) {
        // Находим элемент под курсором
        const elementsUnderCursor = document.elementsFromPoint(e.clientX, e.clientY);
        
        // Ищем первый элемент узла дерева
        const targetNodeElement = elementsUnderCursor.find(el => 
            el.classList.contains('tree-node') && !el.classList.contains('dragging')
        );
        
        // Если не нашли подходящего элемента, очищаем индикаторы
        if (!targetNodeElement) {
            this.clearDropIndicators();
            this.dropTargetId = null;
            this.dropPosition = null;
            return;
        }
        
        // Получаем ID целевого узла
        const targetNodeId = targetNodeElement.dataset.nodeId;
        
        // Нельзя перетаскивать элемент в самого себя или в свои дочерние элементы
        if (targetNodeId === this.draggedNodeId || this.isDescendant(this.draggedNodeId, targetNodeId)) {
            this.clearDropIndicators();
            this.dropTargetId = null;
            this.dropPosition = null;
            return;
        }
        
        // Определяем позицию для сброса (до, после или внутрь)
        const targetRect = targetNodeElement.getBoundingClientRect();
        const relativeY = e.clientY - targetRect.top;
        let position;
        
        if (relativeY < targetRect.height * 0.25) {
            position = 'before';
        } else if (relativeY > targetRect.height * 0.75) {
            position = 'after';
        } else {
            position = 'inside';
        }
        
        // Обновляем цель и позицию
        this.dropTargetId = targetNodeId;
        this.dropPosition = position;
        
        // Отображаем индикатор
        this.showDropIndicator(targetNodeElement, position);
    }

    /**
     * Проверка, является ли один узел потомком другого
     * @param {string} parentId - ID потенциального предка
     * @param {string} childId - ID потенциального потомка
     * @returns {boolean} - true, если childId является потомком parentId
     */
    isDescendant(parentId, childId) {
        if (parentId === childId) return true;
        
        const treeManager = this.core.getModule('treeManager');
        if (!treeManager) return false;
        
        const checkDescendant = (node, targetId) => {
            if (!node || !node.children || node.children.length === 0) {
                return false;
            }
            
            for (const child of node.children) {
                if (child.id === targetId) {
                    return true;
                }
                
                if (checkDescendant(child, targetId)) {
                    return true;
                }
            }
            
            return false;
        };
        
        const parentNode = treeManager.findNodeById(parentId);
        
        // Добавляем отладочную информацию
        console.log('Проверка на потомка', {
            parentId,
            childId,
            parentNode
        });
        
        return parentNode ? checkDescendant(parentNode, childId) : false;
    }

    /**
     * Отображение индикатора позиции для сброса
     */
    showDropIndicator(targetElement, position) {
        // Очищаем все индикаторы
        this.clearDropIndicators();
        
        // Создаем индикатор
        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator';
        
        const rect = targetElement.getBoundingClientRect();
        
        // Устанавливаем позицию индикатора в зависимости от того, куда будет перемещен элемент
        if (position === 'before') {
            indicator.style.left = rect.left + 'px';
            indicator.style.top = rect.top + 'px';
            indicator.style.width = rect.width + 'px';
            targetElement.classList.add('drag-over-top');
        } else if (position === 'after') {
            indicator.style.left = rect.left + 'px';
            indicator.style.top = (rect.bottom - 2) + 'px';
            indicator.style.width = rect.width + 'px';
            targetElement.classList.add('drag-over-bottom');
        } else if (position === 'inside') {
            targetElement.classList.add('drag-over-inside');
        }
        
        // Если индикатор создан, добавляем его в DOM
        if (position !== 'inside') {
            document.body.appendChild(indicator);
            this.lastIndicator = indicator;
        }
    }

    /**
     * Очистка индикаторов позиции
     */
    clearDropIndicators() {
        // Удаляем индикатор, если он есть
        if (this.lastIndicator) {
            this.lastIndicator.remove();
            this.lastIndicator = null;
        }
        
        // Удаляем классы подсветки с элементов
        document.querySelectorAll('.drag-over-top, .drag-over-bottom, .drag-over-inside').forEach(el => {
            el.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-inside');
        });
    }

    /**
     * Очистка визуальных элементов перетаскивания
     */
    cleanupDragVisuals() {
        // Удаляем клон
        if (this.draggedNodeClone) {
            this.draggedNodeClone.remove();
            this.draggedNodeClone = null;
        }
        
        // Удаляем класс перетаскивания с узла
        if (this.draggedElement) {
            this.draggedElement.classList.remove('dragging');
        }
        
        // Очищаем индикаторы
        this.clearDropIndicators();
    }

    /**
     * Сброс состояния перетаскивания
     */
    resetDragState() {
        this.draggedNode = null;
        this.draggedElement = null;
        this.draggedNodeId = null;
        this.draggedNodeClone = null;
        this.dropTargetId = null;
        this.dropPosition = null;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.isDragging = false;
    }

    /**
     * Перемещение узла
     * @param {string} nodeId - ID перемещаемого узла
     * @param {string} targetId - ID целевого узла
     * @param {string} position - позиция ('before', 'after', 'inside')
     */
    moveNode(nodeId, targetId, position) {
        if (!nodeId || !targetId || !position) {
            this.core.logger.log('Недостаточно данных для перемещения узла');
            return false;
        }
        
        const treeManager = this.core.getModule('treeManager');
        if (!treeManager) {
            this.core.logger.log('Не найден модуль treeManager');
            return false;
        }
        
        // Проверяем, существуют ли узлы
        const node = treeManager.findNodeById(nodeId);
        const targetNode = treeManager.findNodeById(targetId);
        
        if (!node || !targetNode) {
            this.core.logger.log('Не найден исходный или целевой узел');
            return false;
        }
        
        // Проверяем валидность операции
        if (nodeId === targetId || this.isDescendant(nodeId, targetId)) {
            this.core.logger.log('Нельзя переместить узел в самого себя или своего потомка');
            return false;
        }
        
        // Находим текущего родителя перемещаемого узла
        const sourceParentNode = this.findParentNode(nodeId);
        if (!sourceParentNode) {
            this.core.logger.log('Не найден родительский узел для перемещаемого элемента');
            return false;
        }
        
        // Сохраняем информацию для логирования
        const oldParentId = sourceParentNode.id;
        let success = false;
        let newParentId = '';
        
        // Добавляем отладочную информацию
        console.log('Перемещение узла', {
            nodeId,
            targetId,
            position,
            sourceParentId: oldParentId
        });
        
        // Выполняем перемещение в зависимости от выбранной позиции
        try {
            if (position === 'inside') {
                // Перемещаем узел внутрь целевого узла
                // Сначала удаляем из исходного родителя
                sourceParentNode.children = sourceParentNode.children.filter(child => child.id !== nodeId);
                
                // Затем добавляем к целевому узлу
                if (!targetNode.children) {
                    targetNode.children = [];
                }
                targetNode.children.push(node);
                
                success = true;
                newParentId = targetId;
            } else {
                // Перемещаем узел перед или после целевого узла
                const targetParentNode = this.findParentNode(targetId);
                
                if (targetParentNode) {
                    // Удаляем из исходного родителя
                    sourceParentNode.children = sourceParentNode.children.filter(child => child.id !== nodeId);
                    
                    // Находим индекс целевого узла среди его братьев
                    const siblings = targetParentNode.children;
                    let targetIndex = -1;
                    
                    for (let i = 0; i < siblings.length; i++) {
                        if (siblings[i].id === targetId) {
                            targetIndex = i;
                            break;
                        }
                    }
                    
                    if (targetIndex !== -1) {
                        // Вычисляем новый индекс
                        const newIndex = position === 'before' ? targetIndex : targetIndex + 1;
                        
                        // Вставляем в новую позицию
                        targetParentNode.children.splice(newIndex, 0, node);
                        
                        success = true;
                        newParentId = targetParentNode.id;
                    }
                }
            }
            
            if (success) {
                this.core.logger.log(`Узел ${nodeId} перемещен от ${oldParentId} к ${newParentId} (${position})`);
                
                // Вызываем событие для обновления дерева
                this.core.events.emit('treeUpdated', { nodeId });
                
                // Обновляем отображение дерева
                if (window.treeRenderer) {
                    window.treeRenderer.render();
                }
                
                return true;
            } else {
                this.core.logger.log(`Не удалось переместить узел ${nodeId}`);
                return false;
            }
        } catch (error) {
            console.error('Ошибка при перемещении узла:', error);
            this.core.logger.log(`Ошибка при перемещении узла: ${error.message}`);
            return false;
        }
    }

    /**
     * Поиск родительского узла
     * @param {string} nodeId - ID узла, для которого ищем родителя
     * @returns {object|null} - родительский узел или null
     */
    findParentNode(nodeId) {
        const treeManager = this.core.getModule('treeManager');
        if (!treeManager) return null;
        
        const rootNode = treeManager.getTreeData();
        return this.findParentNodeRecursive(rootNode, nodeId);
    }

    /**
     * Рекурсивный поиск родительского узла
     */
    findParentNodeRecursive(currentNode, targetId) {
        if (!currentNode || !currentNode.children) {
            return null;
        }
        
        for (const child of currentNode.children) {
            if (child.id === targetId) {
                return currentNode;
            }
        }
        
        for (const child of currentNode.children) {
            const result = this.findParentNodeRecursive(child, targetId);
            if (result) {
                return result;
            }
        }
        
        return null;
    }
}

// Создание экземпляра плагина
const dragNDropPlugin = new DragNDropPlugin();

// Экспорт для использования в других модулях
window.dragNDropPlugin = dragNDropPlugin;
