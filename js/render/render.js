class TreeRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.treeManager = window.treeManager;
        this.typeColors = new Map();
        this.activeNodeId = null;
        this.expandedNodes = new Set();
        
        // По умолчанию корневой узел раскрыт
        const rootNode = this.treeManager.getTreeData();
        if (rootNode) {
            this.expandedNodes.add(rootNode.id);
        }
        
        // Загрузка типов и их цветов
        if (window.inital_types) {
            window.inital_types.forEach(type => {
                this.typeColors.set(type.type.toLowerCase(), type.color);
            });
        }
        
        // Добавляем кеш для максимального значения lv
        this.maxLvValue = 0;
        // Флаг, указывающий, что нужно пересчитать максимальное значение
        this.needToCalculateMaxLv = true;
    }

    initialize() {
        this.render();
        
        // Подписка на события активации/деактивации узлов
        if (window.coreApi) {
            window.coreApi.events.on('nodeActivated', (data) => {
                this.activeNodeId = data.nodeId;
                this.highlightActiveNode();
            });
            
            window.coreApi.events.on('nodeDeactivated', () => {
                this.activeNodeId = null;
                this.highlightActiveNode();
            });
            
            // Добавляем обработчик события обновления дерева
            window.coreApi.events.on('treeUpdated', () => {
                console.log('Получено событие обновления дерева');
                this.render();
            });
            
            // Добавляем обработчик события изменения текста узла
            window.coreApi.events.on('nodeTextChanged', (data) => {
                console.log('Текст узла изменен:', data);
                this.render();
            });
        }
    }

    render() {
        console.log('Вызван метод render() в TreeRenderer');
        
        // Принудительно пересчитываем максимальное значение lv при каждом рендеринге
        this.calculateMaxLvValue();
        
        const treeData = this.treeManager.getTreeData();
        if (!treeData) {
            console.error('Данные дерева недоступны');
            return;
        }
        
        this.container.innerHTML = this.renderNode(treeData);
        
        // Подсветка активного узла после рендеринга
        this.highlightActiveNode();
        
        // Добавляем индикаторы после рендеринга всего дерева
        console.log('Вызываем добавление индикаторов');
        this.addLevelIndicators();
    }

    renderNode(node) {
        if (!node) return '';

        const hasChildren = node.children && node.children.length > 0;
        const nodeType = node.type ? node.type.toLowerCase() : 'unknown';
        
        // Специальная обработка для типа "Do" - добавим оба варианта класса
        let nodeClassExtra = '';
        if (nodeType === 'do') {
            nodeClassExtra = ' node-type-Do node-type-DO';
        }
        
        const nodeClass = `node-type-${nodeType}${nodeClassExtra}`;
        const typeColor = this.typeColors.get(nodeType) || '#666'; // Цвет для типа
        const isActive = node.id === this.activeNodeId ? 'active-node' : '';
        const isExpanded = this.expandedNodes.has(node.id);
        
        // Для отладки выводим информацию о типе узла
        if (nodeType === 'do') {
            console.log(`Рендеринг узла типа "Do" с ID ${node.id}: ${node.text}`);
        }
        
        // Начало узла
        let html = `<div class="tree-node ${nodeClass} ${isActive}" data-node-id="${node.id}" data-node-type="${nodeType}">
            <div class="node-content">
                ${hasChildren ? `<span class="toggle-btn ${isExpanded ? 'open' : ''}">${isExpanded ? '▼' : '▶'}</span>` : '<span class="toggle-placeholder">&#8192;</span>'}
                <span class="node-text">${this.escapeHtml(node.text)}</span>
                <span class="node-type" style="color: ${typeColor}">[${node.type}]</span>
            </div>`;

        // Добавляем дочерние элементы, если они есть
        if (hasChildren) {
            html += `<div class="node-children" style="display: ${isExpanded ? 'block' : 'none'}">`;
            for (const child of node.children) {
                html += this.renderNode(child);
            }
            html += '</div>';
        }

        // Закрываем узел
        html += '</div>';
        
        return html;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setupEventListeners() {
        // Обработка кликов на узлах дерева
        this.container.addEventListener('click', (e) => {
            // Обработка клика на кнопке раскрытия/сворачивания
            const toggleBtn = e.target.closest('.toggle-btn');
            if (toggleBtn) {
                e.stopPropagation(); // Предотвращаем всплытие события
                
                const nodeElement = toggleBtn.closest('.tree-node');
                const nodeId = nodeElement.dataset.nodeId;
                
                // Находим контейнер с дочерними элементами
                const childrenContainer = nodeElement.querySelector('.node-children');
                
                if (childrenContainer) {
                    console.log('Переключение состояния узла:', nodeId);
                    
                    // Проверяем текущее состояние
                    const isExpanded = childrenContainer.style.display !== 'none';
                    console.log('Текущее состояние:', isExpanded ? 'раскрыт' : 'свернут');
                    
                    // Переключаем отображение
                    childrenContainer.style.display = isExpanded ? 'none' : 'block';
                    toggleBtn.textContent = isExpanded ? '▶' : '▼';
                    toggleBtn.classList.toggle('open');
                    
                    // Сохраняем состояние раскрытия узла
                    if (isExpanded) {
                        this.expandedNodes.delete(nodeId);
                    } else {
                        this.expandedNodes.add(nodeId);
                    }
                    
                    console.log('Новое состояние:', !isExpanded ? 'раскрыт' : 'свернут');
                }
            }
            
            // Обработка клика на тексте узла для активации
            const nodeText = e.target.closest('.node-text');
            if (nodeText && window.coreApi) {
                const nodeElement = nodeText.closest('.tree-node');
                if (nodeElement) {
                    const nodeId = nodeElement.dataset.nodeId;
                    const activateItem = window.coreApi.getModule('activateItem');
                    if (activateItem && typeof activateItem.activateNode === 'function') {
                        activateItem.activateNode(nodeId);
                    } else {
                        window.coreApi.events.emit('activateNode', { nodeId });
                    }
                }
            }
        });
    }
    
    /**
     * Подсветка активного узла
     */
    highlightActiveNode() {
        console.log('Подсветка активного узла:', this.activeNodeId);
        
        // Сначала удаляем класс активного узла со всех узлов
        const allNodes = this.container.querySelectorAll('.tree-node');
        allNodes.forEach(node => node.classList.remove('active-node'));
        
        // Если есть активный узел, добавляем ему класс
        if (this.activeNodeId) {
            const activeNode = this.container.querySelector(`.tree-node[data-node-id="${this.activeNodeId}"]`);
            if (activeNode) {
                console.log('Найден активный узел в DOM:', activeNode);
                activeNode.classList.add('active-node');
            } else {
                console.warn('Активный узел не найден в DOM:', this.activeNodeId);
            }
        }
    }

    // Добавляем метод для раскрытия узла и всех его родителей
    expandNodeAndParents(nodeId) {
        const treeManager = this.treeManager;
        if (!treeManager) return;
        
        // Находим узел
        const node = treeManager.findNodeById(nodeId);
        if (!node) return;
        
        // Добавляем узел в список раскрытых
        this.expandedNodes.add(nodeId);
        
        // Находим путь от корня до узла
        const path = this.findPathToNode(nodeId);
        
        // Раскрываем все узлы на пути
        for (const id of path) {
            this.expandedNodes.add(id);
        }
        
        // Перерисовываем дерево
        this.render();
        
        // Прокручиваем к узлу, чтобы он был виден
        setTimeout(() => {
            const nodeElement = this.container.querySelector(`.tree-node[data-node-id="${nodeId}"]`);
            if (nodeElement) {
                nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }

    // Метод для поиска пути от корня до узла
    findPathToNode(nodeId) {
        const path = [];
        const findPath = (currentNode, targetId, currentPath) => {
            if (!currentNode) return false;
            
            // Если нашли узел, возвращаем true
            if (currentNode.id === targetId) {
                return true;
            }
            
            // Если у узла нет детей, возвращаем false
            if (!currentNode.children || currentNode.children.length === 0) {
                return false;
            }
            
            // Проверяем детей
            for (const child of currentNode.children) {
                // Добавляем ID текущего узла в путь
                currentPath.push(currentNode.id);
                
                // Рекурсивно ищем в дочернем узле
                if (findPath(child, targetId, currentPath)) {
                    return true;
                }
                
                // Если не нашли, удаляем ID из пути
                currentPath.pop();
            }
            
            return false;
        };
        
        // Начинаем поиск с корневого узла
        const rootNode = this.treeManager.getTreeData();
        findPath(rootNode, nodeId, path);
        
        return path;
    }

    // Вычисление максимального значения среди всех элементов типа "lv"
    calculateMaxLvValue() {
        console.log('Вызов calculateMaxLvValue');
        this.maxLvValue = 0;
        
        const treeData = this.treeManager.getTreeData();
        if (!treeData) {
            console.error('Данные дерева недоступны для расчёта максимального значения lv');
            return;
        }
        
        // Выводим все узлы в дереве для отладки
        console.log('Структура дерева:', JSON.stringify(treeData, null, 2));
        
        // Находим все узлы типа "lv" в дереве
        const allLvNodes = this.findNodesOfType(treeData, 'lv');
        console.log(`Найдено ${allLvNodes.length} узлов типа lv:`, 
            allLvNodes.map(n => ({ id: n.id, text: n.text })));
        
        if (allLvNodes.length === 0) {
            console.warn('В дереве не найдено ни одного узла типа lv');
            return;
        }
        
        // Проверяем значения
        for (const lvNode of allLvNodes) {
            const value = this.parseNumericValue(lvNode.text);
            console.log(`Узел lv ${lvNode.id}: текст="${lvNode.text}", числовое значение=${value}`);
            if (value > this.maxLvValue) {
                this.maxLvValue = value;
            }
        }
        
        console.log('Максимальное значение lv:', this.maxLvValue);
    }
    
    // Преобразование значения в число
    parseNumericValue(value) {
        if (typeof value === 'undefined' || value === null) return 0;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            // Удаляем все нечисловые символы и конвертируем в число
            const numValue = parseFloat(value.replace(/[^\d.-]/g, ''));
            return isNaN(numValue) ? 0 : numValue;
        }
        return 0;
    }
    
    // Поиск всех узлов определенного типа в поддереве
    findNodesOfType(node, type) {
        const result = [];
        
        if (!node) return result;
        
        // Проверяем текущий узел
        if (node.type === type) {
            result.push(node);
        }
        
        // Рекурсивный поиск в дочерних узлах
        if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
                result.push(...this.findNodesOfType(child, type));
            }
        }
        
        return result;
    }
    
    /**
     * Добавление индикаторов ко всем элементам типа "Do"
     */
    addLevelIndicators() {
        console.log('Добавление индикаторов уровня для элементов типа Do');
        
        // Находим все DOM-элементы узлов с типом "Do"
        // Учитываем, что JS чувствителен к регистру, а значения типов могут быть в разных регистрах
        const doNodeElements = this.container.querySelectorAll('.node-type-do, .node-type-DO, .node-type-Do');
        console.log(`Найдено ${doNodeElements.length} элементов типа Do`);
        
        // Если элементов нет, выходим
        if (doNodeElements.length === 0) {
            // Проверим содержимое DOM для отладки
            console.log('HTML контейнера:', this.container.innerHTML);
            
            // Проверим все типы элементов для отладки
            const allNodeTypes = this.container.querySelectorAll('.tree-node');
            const typeClasses = new Set();
            allNodeTypes.forEach(node => {
                Array.from(node.classList).forEach(cls => {
                    if (cls.startsWith('node-type-')) {
                        typeClasses.add(cls);
                    }
                });
            });
            console.log('Доступные классы типов:', Array.from(typeClasses));
            return;
        }
        
        doNodeElements.forEach(nodeElement => {
            // Получаем ID узла из атрибута data-node-id
            const nodeId = nodeElement.dataset.nodeId;
            if (!nodeId) {
                console.log('Элемент без ID:', nodeElement);
                return;
            }
            
            console.log('Обработка узла Do с ID:', nodeId);
            
            // Находим узел в дереве данных
            const node = this.treeManager.findNodeById(nodeId);
            if (!node) {
                console.log('Узел не найден в данных:', nodeId);
                return;
            }
            
            // Устанавливаем позиционирование для родительского элемента
            nodeElement.style.position = 'relative';
            
            // Добавляем индикатор для lv (оранжевый/зеленый)
            this.addLvIndicator(node, nodeElement);
            
            // Добавляем индикатор для dl (синий)
            this.addDlIndicator(node, nodeElement);
        });
    }

    /**
     * Добавление индикатора на основе значений lv
     * @param {Object} node - узел дерева
     * @param {HTMLElement} nodeElement - DOM-элемент узла
     */
    addLvIndicator(node, nodeElement) {
        // Находим элементы "lv" в поддереве этого "Do"
        const lvNodes = this.findNodesOfType(node, 'lv');
        if (lvNodes.length === 0) {
            console.log('Нет элементов lv в поддереве узла:', node.id);
            return;
        }
        
        console.log('Найдены элементы lv:', lvNodes.map(n => `${n.id}:${n.text}`).join(', '));
        
        // Берем первый найденный элемент "lv"
        const lvValue = this.parseNumericValue(lvNodes[0].text);
        console.log('Значение lv:', lvValue);
        
        // Если максимальное значение не определено или равно 0, выходим
        if (this.maxLvValue <= 0) {
            console.log('Максимальное значение lv равно 0, индикатор не будет отображаться');
            return;
        }
        
        // Вычисляем процент от максимального значения
        const percentage = Math.min(100, Math.max(0, (lvValue / this.maxLvValue) * 100));
        console.log('Процент от максимального значения:', percentage);
        
        // Находим элементы "xn" для определения цвета
        const xnNodes = this.findNodesOfType(node, 'xn');
        let color = '#ff8c00'; // Оранжевый по умолчанию
        
        if (xnNodes.length > 0) {
            const xnText = xnNodes[0].text || '';
            console.log('Текст элемента xn:', xnText);
            if (xnText.toLowerCase().includes('n')) {
                color = '#006400'; // Темно-зеленый
            } else if (xnText.toLowerCase().includes('x')) {
                color = '#ff8c00'; // Оранжевый
            }
        }
        
        // Удаляем старый индикатор, если он есть
        const existingIndicator = nodeElement.querySelector('.level-indicator-lv');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Создаем и добавляем индикатор
        const indicator = document.createElement('div');
        indicator.className = 'level-indicator-lv';
        indicator.style.position = 'absolute';
        indicator.style.top = '0';
        indicator.style.left = '0';
        indicator.style.height = '1px'; // Увеличиваем высоту для лучшей видимости
        indicator.style.width = `${percentage}%`;
        indicator.style.backgroundColor = color;
        indicator.style.zIndex = '10'; // Повышаем z-index, чтобы индикатор был поверх других элементов
        
        // Добавляем индикатор
        nodeElement.appendChild(indicator);
        console.log('Индикатор lv добавлен для узла:', node.id);
    }

    /**
     * Добавление индикатора на основе значений dl
     * @param {Object} node - узел дерева
     * @param {HTMLElement} nodeElement - DOM-элемент узла
     */
    addDlIndicator(node, nodeElement) {
        // Находим элементы "dl" в поддереве этого "Do"
        const dlNodes = this.findNodesOfType(node, 'dl');
        if (dlNodes.length === 0) {
            console.log('Нет элементов dl в поддереве узла:', node.id);
            return;
        }
        
        console.log('Найдены элементы dl:', dlNodes.map(n => `${n.id}:${n.text}`).join(', '));
        
        // Берем первый найденный элемент "dl"
        const dlText = dlNodes[0].text || '';
        console.log('Текст dl:', dlText);
        
        // Преобразуем текст в числовое значение
        const dlValue = this.parseNumericValue(dlText);
        console.log('Значение dl:', dlValue);
        
        // Если значение равно 0, выходим
        if (dlValue <= 0) {
            console.log('Значение dl равно 0 или отрицательно, индикатор не будет отображаться');
            return;
        }
        
        // Максимальная длина линии - 240px
        const maxWidth = 240;
        
        // Вычисляем ширину индикатора (не более максимальной)
        const width = Math.min(dlValue, maxWidth);
        console.log('Ширина индикатора dl:', width);
        
        // Удаляем старый индикатор, если он есть
        const existingIndicator = nodeElement.querySelector('.level-indicator-dl');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Создаем и добавляем индикатор
        const indicator = document.createElement('div');
        indicator.className = 'level-indicator-dl';
        indicator.style.position = 'absolute';
        indicator.style.top = '1px'; // Располагаем выше индикатора lv
        indicator.style.left = '0';
        indicator.style.height = '1px';
        indicator.style.width = `${width}px`; // Абсолютная ширина в пикселях
        indicator.style.backgroundColor = '#0066cc'; // Синий цвет
        indicator.style.zIndex = '10';
        
        // Добавляем индикатор
        nodeElement.appendChild(indicator);
        console.log('Индикатор dl добавлен для узла:', node.id);
    }
}

// Восстанавливаем стили и инициализацию рендерера
const style = document.createElement('style');
style.textContent = `
    .tree-node {
        margin-left: 20px;
    }
    .node-content {
        padding: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .toggle-btn {
        cursor: pointer;
        user-select: none;
    }
    .node-text {
        color: black; /* Устанавливаем черный цвет для текста */
    }
    .node-type {
        font-size: 0.9em;
        /* Цвет типа задается динамически в HTML */
    }
    .node-type-root {
        font-weight: bold;
    }
    .node-children {
        display: none;
    }
    
    /* Стили для активного узла */
    .active-node > .node-content {
        background-color: #e7f3ff;
        border: 1px solid #99c9ff;
        border-radius: 4px;
    }
    
    .active-node > .node-content .node-text {
        font-weight: bold;
    }
`;
document.head.appendChild(style);

// Инициализация рендерера после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    const treeRenderer = new TreeRenderer('tree');
    treeRenderer.initialize();
    treeRenderer.setupEventListeners();
    
    // Делаем рендерер доступным глобально
    window.treeRenderer = treeRenderer;
    
    // Добавляем принудительное обновление через некоторое время,
    // чтобы убедиться, что все данные загружены
    setTimeout(() => {
        console.log('Принудительное обновление дерева для проверки индикаторов');
        treeRenderer.render();
    }, 1000);
    
    // Добавляем обработчик для обновления при изменении дерева
    if (window.coreApi) {
        window.coreApi.events.on('treeUpdated', () => {
            console.log('TreeRenderer: получено событие обновления дерева');
            treeRenderer.render();
        });
    }
});