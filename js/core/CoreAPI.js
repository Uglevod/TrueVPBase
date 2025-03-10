class CoreAPI {
    constructor() {
        this.events = new EventSystem();
        this.logger = new Logger();
        this.pluginManager = new PluginManager(this);
        this.modules = new Map();
        
        // Инициализация дерева и типов
        this.registerModule('treeManager', window.treeManager);
        this.registerModule('types', { getTypes: () => inital_types });
        this.registerModule('ttypes', { getTTypes: () => init_ttype });
    }

    registerModule(name, module) {
        try {
            this.modules.set(name, module);
            this.logger.log(`Модуль ${name} зарегистрирован`);
            return true;
        } catch (error) {
            this.logger.log(`Ошибка при регистрации модуля ${name}: ${error.message}`);
            return false;
        }
    }

    execute(command, data) {
        try {
            this.logger.log(`Выполнение команды: ${command}`);
            this.events.emit('command', { command, data });
        } catch (error) {
            this.logger.log(`Ошибка при выполнении команды ${command}: ${error.message}`);
        }
    }

    getModule(name) {
        return this.modules.get(name);
    }
}