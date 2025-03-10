class PluginManager {
    constructor(core) {
        this.core = core;
        this.plugins = new Map();
    }

    registerPlugin(name, plugin) {
        try {
            if (this.plugins.has(name)) {
                this.core.logger.log(`Плагин ${name} уже зарегистрирован, заменяем`);
            }
            
            this.plugins.set(name, plugin);
            plugin.init(this.core);
            this.core.logger.log(`Плагин ${name} успешно загружен`);
            return true;
        } catch (error) {
            this.core.logger.log(`Ошибка при загрузке плагина ${name}: ${error.message}`);
            return false;
        }
    }

    unregisterPlugin(name) {
        if (this.plugins.has(name)) {
            const plugin = this.plugins.get(name);
            if (plugin.destroy && typeof plugin.destroy === 'function') {
                try {
                    plugin.destroy();
                } catch (error) {
                    this.core.logger.log(`Ошибка при выгрузке плагина ${name}: ${error.message}`);
                }
            }
            this.plugins.delete(name);
            this.core.logger.log(`Плагин ${name} удалён`);
            return true;
        }
        return false;
    }

    getPlugin(name) {
        return this.plugins.get(name);
    }

    listPlugins() {
        const plugins = Array.from(this.plugins.keys());
        this.core.logger.log(`Зарегистрированные плагины: ${plugins.join(', ')}`);
        return plugins;
    }
}