class Logger {
    constructor() {
        this.logElement = document.getElementById('log');
        // Если элемент лога не найден, создаем его
        if (!this.logElement) {
            console.warn('Элемент лога не найден, логирование в DOM недоступно');
        }
    }

    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        
        if (this.logElement) {
            this.logElement.innerHTML += logEntry + '<br>';
            this.logElement.scrollTop = this.logElement.scrollHeight;
        }
        
        console.log(logEntry);
    }
}